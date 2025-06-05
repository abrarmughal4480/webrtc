import "dotenv/config";
import express from 'express';
import cors from 'cors';
import http from 'http';
import { SocketService } from "./services/socketService.js";
import { v4 as uuidv4 } from 'uuid';
import sendMessage from "./services/twilloService.js";
import { sendMail } from "./services/mailService.js";
import { connectDB } from "./utils/database.js";
import ErrorMiddleware from "./middlewares/error.js";
import router from "./route.js";
import cookieParser from "cookie-parser"

console.log('🚀 Starting server initialization...');

connectDB();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(cookieParser());

// Optimized payload size limits for faster uploads
console.log('📦 Setting up optimized payload limits...');
const MAX_SIZE = process.env.MAX_FILE_SIZE || '100mb';
const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT) || 120000; // 2 minutes default

app.use(express.json({ 
    limit: MAX_SIZE,
    parameterLimit: 50000
}));

app.use(express.urlencoded({ 
    limit: MAX_SIZE,
    extended: true,
    parameterLimit: 50000
}));

// Optimized timeout middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Set different timeouts based on operation type
    let operationTimeout = TIMEOUT;
    
    // Shorter timeout for delete operations
    if (req.method === 'DELETE') {
        operationTimeout = 30000; // 30 seconds for delete operations
    }
    
    // Set shorter timeout for better performance
    req.setTimeout(operationTimeout, () => {
        const duration = Date.now() - startTime;
        console.error(`❌ Request timeout after ${duration}ms - ${req.method} ${req.path}`);
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                message: req.method === 'DELETE' ? 'Delete operation timeout. The item may have been deleted.' : 'Upload timeout. Please try with smaller files or check your connection.',
                timeout_duration: `${duration}ms`
            });
        }
    });
    
    res.setTimeout(operationTimeout, () => {
        const duration = Date.now() - startTime;
        console.error(`❌ Response timeout after ${duration}ms`);
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                message: 'Response timeout'
            });
        }
    });
    
    // Log request with timestamp
    const contentLength = req.get('Content-Length');
    console.log(`📊 [${new Date().toISOString()}] ${req.method} ${req.path} - Size: ${contentLength ? (contentLength / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'} - Timeout: ${operationTimeout}ms`);
    next();
});

// Enhanced error handling middleware for payload issues
app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') {
        console.error('❌ Payload too large error:', {
            url: req.path,
            method: req.method,
            contentLength: req.get('Content-Length')
        });
        return res.status(413).json({
            success: false,
            message: `File size too large. Maximum allowed size is ${MAX_SIZE}. Please compress your files.`,
            details: `Current limit: ${MAX_SIZE}`
        });
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.error('❌ Connection error:', error.code);
        return res.status(408).json({
            success: false,
            message: 'Connection timeout. Please try again with a stable internet connection.'
        });
    }
    
    next(error);
});

const server = http.createServer(app);

// Optimized server timeouts
server.timeout = TIMEOUT;
server.keepAliveTimeout = TIMEOUT - 1000;
server.headersTimeout = TIMEOUT + 1000;

console.log(`🔧 Server timeouts configured: ${TIMEOUT}ms`);

const socketService = new SocketService(server);
socketService.setupSocketListeners();

app.get('/', (req, res) => {
    res.json({
        message: 'Server is running with optimized upload support',
        config: {
            max_file_size: MAX_SIZE,
            timeout: `${TIMEOUT}ms`,
            cloudinary_timeout: `${process.env.CLOUDINARY_UPLOAD_TIMEOUT}ms`
        }
    });
});

app.get('/send-token', async (req, res) => {
    try {
        const { number, email, landlordName, profileImage, landlordLogo } = req.query;
        console.log('📞 Received token request:', { number, email, landlordName, profileImage, landlordLogo });
        
        if (!number && !email) {
            return res.status(400).json({ error: 'Either phone number or email is required' });
        }
        
        const token = uuidv4();
        console.log('🎫 Generated meeting token:', token);
        
        // Build URL with profile data - using /room/{token} instead of /room/[token]
        let url = `${process.env.FRONTEND_URL}/room/${token}`;
        const urlParams = new URLSearchParams();
        
        if (landlordName) {
            urlParams.append('landlordName', landlordName);
        }
        if (profileImage) {
            urlParams.append('profileImage', profileImage);
        }
        if (landlordLogo) {
            urlParams.append('landlordLogo', landlordLogo);
        }
        
        if (urlParams.toString()) {
            url += `?${urlParams.toString()}`;
        }
        
        console.log('🔗 Generated URL with profile data:', url.substring(0, 100) + '...');
        
        const message = `Please click on the link below to connect with your landlord ${url}`;
        
        if (number) {
            console.log('📱 Sending SMS to:', number);
            await sendMessage(number, message);
        }
        
        if (email) {
            console.log('📧 Sending email to:', email);
            await sendMail(email, "Landlord", message);
        }
        
        res.json({ 
            token,
            profileData: {
                landlordName,
                profileImage,
                landlordLogo
            }
        });
    } catch (error) {
        console.error('❌ Error in send-token:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

app.use("/api/v1", router);
app.use(ErrorMiddleware);

server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT} with optimized upload support`);
    console.log(`📊 Max file size: ${MAX_SIZE}`);
    console.log(`⏱️ Request timeout: ${TIMEOUT}ms`);
    console.log(`☁️ Cloudinary timeout: ${process.env.CLOUDINARY_UPLOAD_TIMEOUT}ms`);
});







