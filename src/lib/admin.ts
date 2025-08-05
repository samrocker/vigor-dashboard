import axiosClient from "./axios";
import { AllAdminsResponse, CreateAdminPayload, SingleAdminResponse, UpdateAdminPayload } from "@/types/schemas/admin";

export const getAllAdmins = async (): Promise<AllAdminsResponse> => {
    const response = await axiosClient.get("/admin");
    return response.data;
};

export const getAdminById = async (id: string): Promise<SingleAdminResponse> => {
    const response = await axiosClient.get(`/admin/${id}`);
    return response.data;
};

export const createAdmin = async (payload: CreateAdminPayload): Promise<SingleAdminResponse> => {
    const response = await axiosClient.post("/admin", payload);
    return response.data;
};

export const updateAdmin = async (id: string, payload: UpdateAdminPayload): Promise<SingleAdminResponse> => {
    const response = await axiosClient.patch(`/admin/${id}`, payload);
    return response.data;
};

export const deleteAdmin = async (id: string) => {
    const response = await axiosClient.delete(`/admin/${id}`);
    return response.data;
}; 