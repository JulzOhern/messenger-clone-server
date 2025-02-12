declare namespace Express {
    interface Request {
        user: {
            id: string;
            username: string;
            email: string;
            createdAt: Date;
            updatedAt: Date;
        } | null
    }
}