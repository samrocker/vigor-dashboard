
export interface Admin {
    id: string;
    role: "SUPER" | "SUB";
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

export interface AllAdminsResponse {
    data: {
        admins: Admin[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    status: string;
    message: string;
}

export interface SingleAdminResponse {
    data: {
        admin: Admin;
    };
    status: string;
    message: string;
}

export interface CreateAdminPayload {
    email: string;
    name: string;
}

export interface UpdateAdminPayload {
    name: string;
} 