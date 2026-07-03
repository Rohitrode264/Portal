import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        
        await mongoose.connect(uri);
        console.log('MongoDB Connected to Portal (Shared Database)');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
