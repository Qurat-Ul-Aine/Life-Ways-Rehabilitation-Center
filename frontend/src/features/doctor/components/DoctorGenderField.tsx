import {
  formatDoctorGender,
  parseDoctorGenderForForm,
  resolveDoctorGenderFromForm,
  type DoctorGenderFormState,
  type DoctorGenderOption,
} from "../utils/doctorGender";

interface Props {
  value?: string | null;
  gender: DoctorGenderOption;
  genderOther: string;
  onChange: (next: DoctorGenderFormState) => void;
  required?: boolean;
  inputClassName?: string;
  labelClassName?: string;
  idPrefix?: string;
  readOnly?: boolean;
}

const DoctorGenderField = ({
  value,
  gender,
  genderOther,
  onChange,
  required = false,
  inputClassName = "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30",
  labelClassName = "block text-sm font-semibold mb-1.5 text-foreground",
  idPrefix = "doctor-gender",
  readOnly = false,
}: Props) => {
  if (readOnly) {
    return (
      <div>
        <label className={labelClassName}>Gender</label>
        <p className="text-sm text-foreground">{formatDoctorGender(value)}</p>
      </div>
    );
  }

  const handleGenderChange = (next: DoctorGenderOption) => {
    onChange({
      gender: next,
      genderOther: next === "other" ? genderOther : "",
    });
  };

  const parsed = parseDoctorGenderForForm(value);
  const effectiveGender = gender || parsed.gender;
  const effectiveOther = genderOther || parsed.genderOther;

  return (
    <div className="space-y-2">
      <label htmlFor={`${idPrefix}-select`} className={labelClassName}>
        Gender{required ? " *" : ""}
      </label>
      <select
        id={`${idPrefix}-select`}
        required={required}
        value={effectiveGender}
        onChange={(e) => handleGenderChange(e.target.value as DoctorGenderOption)}
        className={inputClassName}
      >
        <option value="">Select gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
      {effectiveGender === "other" && (
        <input
          id={`${idPrefix}-other`}
          required={required}
          value={effectiveOther}
          onChange={(e) =>
            onChange({
              gender: "other",
              genderOther: e.target.value,
            })
          }
          className={inputClassName}
          placeholder="Please specify gender"
        />
      )}
    </div>
  );
};

export { resolveDoctorGenderFromForm };
export default DoctorGenderField;
