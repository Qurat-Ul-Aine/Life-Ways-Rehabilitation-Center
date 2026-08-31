export type BasicInfoForm = {
  age: string;
  gender: string;
};

export function validateBasicInfo(form: BasicInfoForm): string | null {
  const ageNum = Number(form.age);
  if (!form.age || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
    return "Please enter a valid age between 1 and 120.";
  }
  if (!form.gender) {
    return "Please select a gender.";
  }
  return null;
}
