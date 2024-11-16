// fields.ts
export const FIELDS = {
    PATIENT_NAME: "Patient Name",
    AGE: "Age",
    DOCTOR_NAME: "Doctor Name",
    DOCTOR_DEPARTMENT: "Doctor Department",
    ADDRESS: "Address",
    GENDER: "Gender",
    BOOKING_TYPE: "Booking/walkin"
  } as const;
  
  export type FieldName = typeof FIELDS[keyof typeof FIELDS];