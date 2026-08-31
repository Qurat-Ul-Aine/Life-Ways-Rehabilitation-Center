import { useState, useCallback } from "react";
import { doctorService, type DoctorFilters } from "../services/doctorService";
import type { Doctor, DoctorInput } from "../doctor.types";

interface UseDoctorsState {
  doctors: Doctor[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useDoctors() {
  const [state, setState] = useState<UseDoctorsState>({
    doctors: [],
    total: 0,
    loading: false,
    error: null,
  });

  const setLoading = () =>
    setState((s) => ({ ...s, loading: true, error: null }));

  const setError = (msg: string) =>
    setState((s) => ({ ...s, loading: false, error: msg }));

  const fetchDoctors = useCallback(async (filters?: DoctorFilters) => {
    setLoading();
    try {
      const res = await doctorService.getAll(filters);
      setState({ doctors: res.items, total: res.total, loading: false, error: null });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message ?? "Failed to load doctors.";
      setError(msg);
    }
  }, []);

  const create = useCallback(async (input: DoctorInput): Promise<Doctor> => {
    const doctor = await doctorService.create(input);
    setState((s) => ({
      ...s,
      doctors: [...s.doctors, doctor],
      total: s.total + 1,
    }));
    return doctor;
  }, []);

  const update = useCallback(async (id: string, input: DoctorInput): Promise<Doctor> => {
    const doctor = await doctorService.update(id, input);
    setState((s) => ({
      ...s,
      doctors: s.doctors.map((d) => (d.id === id ? doctor : d)),
    }));
    return doctor;
  }, []);

  const approve = useCallback(async (id: string): Promise<Doctor> => {
    const doctor = await doctorService.approve(id);
    setState((s) => ({
      ...s,
      doctors: s.doctors.map((d) => (d.id === id ? doctor : d)),
    }));
    return doctor;
  }, []);

  const toggleActive = useCallback(async (id: string) => {
    const res = await doctorService.toggleActive(id);
    setState((s) => ({
      ...s,
      doctors: s.doctors.map((d) =>
        d.id === id ? { ...d, is_active: res.is_active } : d
      ),
    }));
    return res;
  }, []);

  const remove = useCallback(async (id: string) => {
    await doctorService.remove(id);
    setState((s) => ({
      ...s,
      doctors: s.doctors.filter((d) => d.id !== id),
      total: s.total - 1,
    }));
  }, []);

  return {
    doctors: state.doctors,
    total: state.total,
    loading: state.loading,
    error: state.error,
    fetchDoctors,
    create,
    update,
    approve,
    toggleActive,
    remove,
  };
}