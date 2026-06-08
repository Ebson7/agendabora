/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum VehicleType {
  Truck = "Truck",
  VUC = "VUC",
  Carreta = "Carreta",
  Van = "Van",
}

export enum ProductType {
  Balas = "Balas",
  Chocolates = "Chocolates",
  Biscoitos = "Biscoitos",
  Salgadinhos = "Salgadinhos",
  Bebidas = "Bebidas",
  Outros = "Outros",
}

export enum AppointmentStatus {
  Aguardando = "AGUARDANDO CONFIRMAÇÃO",
  Confirmado = "CONFIRMADO",
  EmRecebimento = "EM RECEBIMENTO",
  Concluido = "CONCLUÍDO",
  Cancelado = "CANCELADO",
}

export interface Appointment {
  id: string; // protocol like BC-2026-NNNN
  supplierName: string;
  cnpj: string;
  driverName: string;
  plate: string;
  vehicleType: VehicleType;
  date: string; // YYYY-MM-DD
  timeSlot: string; // Ex: "08:00 - 09:00"
  productType: ProductType;
  volume: number;
  pallets: number; // estimated pallets count
  weight: number; // in kg
  invoiceNumber?: string;
  invoiceNumbers?: string[];
  cargoValue?: number;
  notes?: string;
  status: AppointmentStatus;
  createdBy: string; // Name of the person scheduling the appointment
  createdAt: string; // ISO date string
}

export interface TimeSlotAvailability {
  slot: string;
  slotsRemaining: number;
  totalActive: number;
}
