export interface Location {
  id: number;
  ubigeo: string;
  district: string;
  province: string;
  department: string;
  displayName: string;
  active: boolean;
}

export interface Department {
  name: string;
  count: number;
}

export interface Province {
  name: string;
  count: number;
}
