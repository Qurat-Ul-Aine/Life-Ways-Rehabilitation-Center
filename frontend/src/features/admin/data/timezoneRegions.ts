export type TimezoneCity = {
  value: string;
  label: string;
};

export type TimezoneRegion = {
  country: string;
  cities: TimezoneCity[];
};

export const TIMEZONE_REGIONS: TimezoneRegion[] = [
  {
    country: "Pakistan",
    cities: [
      { value: "Asia/Islamabad", label: "Islamabad" },
      { value: "Asia/Karachi", label: "Karachi" },
      { value: "Asia/Karachi", label: "Lahore" },
      { value: "Asia/Karachi", label: "Rawalpindi" },
      { value: "Asia/Karachi", label: "Peshawar" },
      { value: "Asia/Karachi", label: "Quetta" },
      { value: "Asia/Karachi", label: "Multan" },
      { value: "Asia/Karachi", label: "Faisalabad" },
      { value: "Asia/Karachi", label: "Hyderabad" },
      { value: "Asia/Karachi", label: "Gujranwala" },
      { value: "Asia/Karachi", label: "Abbottabad" },
    ],
  },
  {
    country: "United Arab Emirates",
    cities: [
      { value: "Asia/Dubai", label: "Dubai" },
      { value: "Asia/Dubai", label: "Abu Dhabi" },
      { value: "Asia/Dubai", label: "Sharjah" },
    ],
  },
  {
    country: "India",
    cities: [
      { value: "Asia/Kolkata", label: "New Delhi" },
      { value: "Asia/Kolkata", label: "Mumbai" },
      { value: "Asia/Kolkata", label: "Kolkata" },
      { value: "Asia/Kolkata", label: "Bangalore" },
      { value: "Asia/Kolkata", label: "Chennai" },
    ],
  },
  {
    country: "United Kingdom",
    cities: [
      { value: "Europe/London", label: "London" },
      { value: "Europe/London", label: "Manchester" },
      { value: "Europe/London", label: "Birmingham" },
    ],
  },
  {
    country: "United States",
    cities: [
      { value: "America/New_York", label: "New York (Eastern)" },
      { value: "America/Chicago", label: "Chicago (Central)" },
      { value: "America/Denver", label: "Denver (Mountain)" },
      { value: "America/Los_Angeles", label: "Los Angeles (Pacific)" },
    ],
  },
  {
    country: "UTC",
    cities: [{ value: "UTC", label: "Coordinated Universal Time" }],
  },
];

export const ALL_TIMEZONE_VALUES = [
  ...new Set(TIMEZONE_REGIONS.flatMap((r) => r.cities.map((c) => c.value))),
];

export function formatTimezoneDisplay(timezone: string): string {
  for (const region of TIMEZONE_REGIONS) {
    if (region.cities.some((city) => city.value === timezone)) {
      return `${region.country} (${timezone})`;
    }
  }
  return timezone;
}

export function findRegionForTimezone(timezone: string): TimezoneRegion | undefined {
  return TIMEZONE_REGIONS.find((region) =>
    region.cities.some((city) => city.value === timezone),
  );
}
