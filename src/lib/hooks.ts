import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

/** Сонголтын жагсаалтуудыг олон дэлгэц дундаа дахин ашиглана. */

export const useInstruments = () =>
  useQuery({
    queryKey: ["instruments", "all"],
    queryFn: async () =>
      (await api.get("/instrument", { params: { limit: 100 } })).data
        .rows as any[],
    staleTime: 60_000,
  });

export const useTeachers = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ["teachers", "all", params],
    queryFn: async () =>
      (await api.get("/teacher", { params: { limit: 200, ...params } })).data
        .rows as any[],
    staleTime: 60_000,
  });

export const useRooms = () =>
  useQuery({
    queryKey: ["rooms", "all"],
    queryFn: async () =>
      (await api.get("/room", { params: { limit: 100 } })).data.rows as any[],
    staleTime: 60_000,
  });

export const useSetting = () =>
  useQuery({
    queryKey: ["setting"],
    queryFn: async () => (await api.get("/setting")).data as any,
    staleTime: 60_000,
  });

export const useStudents = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ["students", "all", params],
    queryFn: async () =>
      (await api.get("/student", { params: { limit: 200, ...params } })).data
        .rows as any[],
    staleTime: 30_000,
  });
