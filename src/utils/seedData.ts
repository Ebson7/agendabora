/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Appointment, AppointmentStatus, VehicleType, ProductType } from "../types";

/**
 * Utility to generate a ISO string date shifted by a number of days
 */
function getRelativeDateStr(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  
  // Handle Sundays! If the relative date falls on Sunday, move it one more day
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateSeedAppointments(): Appointment[] {
  const tomorrow = getRelativeDateStr(1);
  const afterTomorrow = getRelativeDateStr(2);
  const threeDaysLater = getRelativeDateStr(3);

  return [
    {
      id: "BC-2026-0001",
      supplierName: "Nestlé Brasil Ltda",
      cnpj: "60.409.075/0001-52",
      driverName: "Claudio Ramos Souza",
      plate: "EFH-4A23",
      vehicleType: VehicleType.Carreta,
      date: tomorrow,
      timeSlot: "08:00 - 09:00",
      productType: ProductType.Chocolates,
      volume: 450,
      pallets: 15,
      weight: 8500,
      invoiceNumber: "123455",
      notes: "Carga paletizada. Necessita de transpaleteira elétrica.",
      status: AppointmentStatus.Confirmado,
      createdAt: new Date().toISOString(),
    },
    {
      id: "BC-2026-0002",
      supplierName: "Arcor do Brasil Ltda",
      cnpj: "42.123.456/0002-89",
      driverName: "Antônio Santos",
      plate: "GHK-9812",
      vehicleType: VehicleType.Truck,
      date: tomorrow,
      timeSlot: "08:00 - 09:00",
      productType: ProductType.Balas,
      volume: 200,
      pallets: 8,
      weight: 3500,
      invoiceNumber: "987110",
      notes: "Balas sortidas e chicletes.",
      status: AppointmentStatus.Aguardando,
      createdAt: new Date().toISOString(),
    },
    {
      id: "BC-2026-0003",
      supplierName: "Chocolates Garoto S.A.",
      cnpj: "28.555.999/0001-10",
      driverName: "Fernanda Lima de Oliveira",
      plate: "BRA-2D99",
      vehicleType: VehicleType.VUC,
      date: tomorrow,
      timeSlot: "10:00 - 11:00",
      productType: ProductType.Chocolates,
      volume: 120,
      pallets: 4,
      weight: 1800,
      invoiceNumber: "554412",
      notes: "Entrega programada.",
      status: AppointmentStatus.EmRecebimento,
      createdAt: new Date().toISOString(),
    },
    {
      id: "BC-2026-0004",
      supplierName: "M. Dias Branco (Adria)",
      cnpj: "07.654.321/0001-44",
      driverName: "Roberto Barbosa",
      plate: "CWX-5544",
      vehicleType: VehicleType.Carreta,
      date: tomorrow,
      timeSlot: "14:00 - 15:00",
      productType: ProductType.Biscoitos,
      volume: 500,
      pallets: 18,
      weight: 9000,
      invoiceNumber: "321321",
      notes: "Carga cheia de biscoitos recheados.",
      status: AppointmentStatus.Concluido,
      createdAt: new Date().toISOString(),
    },
    {
      id: "BC-2026-0005",
      supplierName: "Bauducco Ind. Alimentos",
      cnpj: "60.111.222/0001-33",
      driverName: "Sérgio Reis Gomes",
      plate: "MLP-8I21",
      vehicleType: VehicleType.Van,
      date: afterTomorrow,
      timeSlot: "09:00 - 10:00",
      productType: ProductType.Biscoitos,
      volume: 80,
      pallets: 3,
      weight: 950,
      invoiceNumber: "223344",
      notes: "Entrega expressa de cookies de chocolate.",
      status: AppointmentStatus.Confirmado,
      createdAt: new Date().toISOString(),
    },
    {
      id: "BC-2026-0006",
      supplierName: "Coca-Cola Femsa S.A.",
      cnpj: "12.345.678/0001-00",
      driverName: "Marcos Aurelio Santos",
      plate: "KJD-9H10",
      vehicleType: VehicleType.Carreta,
      date: afterTomorrow,
      timeSlot: "09:00 - 10:00",
      productType: ProductType.Bebidas,
      volume: 600,
      pallets: 24,
      weight: 12000,
      invoiceNumber: "908070",
      notes: "Carga pesada de refrigerantes em lata para promoção.",
      status: AppointmentStatus.Aguardando,
      createdAt: new Date().toISOString(),
    },
    {
      id: "BC-2026-0007",
      supplierName: "Hershey do Brasil Ltda",
      cnpj: "11.222.333/0001-44",
      driverName: "Luiz Inácio da Silva Neto",
      plate: "HJK-4321",
      vehicleType: VehicleType.Truck,
      date: afterTomorrow,
      timeSlot: "16:00 - 17:00",
      productType: ProductType.Chocolates,
      volume: 180,
      pallets: 6,
      weight: 2200,
      invoiceNumber: "404102",
      notes: "Docas frias preferencialmente.",
      status: AppointmentStatus.Cancelado,
      createdAt: new Date().toISOString(),
    },
    {
      id: "BC-2026-0008",
      supplierName: "Pecon Alimentos Ltda",
      cnpj: "99.888.777/0001-66",
      driverName: "Zeca de Souza",
      plate: "PEK-1020",
      vehicleType: VehicleType.VUC,
      date: threeDaysLater,
      timeSlot: "11:00 - 12:00",
      productType: ProductType.Salgadinhos,
      volume: 320,
      pallets: 11,
      weight: 1500,
      invoiceNumber: "776655",
      notes: "Salgadinhos de batata e milho.",
      status: AppointmentStatus.Confirmado,
      createdAt: new Date().toISOString(),
    },
  ];
}
