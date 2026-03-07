import { Request, Response, NextFunction } from "express";
export interface JwtPayload {
    id: number;
    username: string;
}
export declare function generateToken(payload: JwtPayload): string;
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map