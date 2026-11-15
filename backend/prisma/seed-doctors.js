const { PrismaClient } = require("../generated/prisma-client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Placeholder doctor images from publicly available stock photos
const DOCTOR_IMAGES = [
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face", // Male doctor
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face", // Female doctor
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face", // Male doctor
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop&crop=face", // Female doctor
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face", // Male doctor
];

const DOCTORS = [
  {
    name: "Dr. Sarah Ahmed",
    email: "sarah.ahmed@lifeways.com",
    phone: "+92 300 1234567",
    license_no: "PMC-78901",
    specialization: "Psychiatry",
    qualification: "MBBS, FCPS (Psychiatry)",
    role: "Doctor",
    experience: 12,
    consultation_fee: 3500,
    patients_treated: 850,
    success_rate: 92,
    gender: "Female",
    about: "Dr. Sarah Ahmed is a board-certified psychiatrist with over 12 years of experience in treating mood disorders, anxiety, and psychotic conditions. She specializes in medication management and psychotherapy integration.",
    services: ["psychotic-support", "psychological-training"],
  },
  {
    name: "Dr. James Wilson",
    email: "james.wilson@lifeways.com",
    phone: "+92 301 2345678",
    license_no: "PMC-78902",
    specialization: "Addiction Recovery",
    qualification: "MBBS, MD (Addiction Medicine)",
    role: "Doctor",
    experience: 15,
    consultation_fee: 4000,
    patients_treated: 1200,
    success_rate: 88,
    gender: "Male",
    about: "Dr. James Wilson is an addiction medicine specialist with 15 years of experience in substance abuse treatment. He leads our Addiction Therapy program with expertise in detoxification and relapse prevention.",
    services: ["addiction-therapy"],
  },
  {
    name: "Dr. Ayesha Khan",
    email: "ayesha.khan@lifeways.com",
    phone: "+92 302 3456789",
    license_no: "PMC-78903",
    specialization: "Clinical Psychology",
    qualification: "PhD Clinical Psychology, RCP",
    role: "Psychologist",
    experience: 8,
    consultation_fee: 3000,
    patients_treated: 620,
    success_rate: 95,
    gender: "Female",
    about: "Dr. Ayesha Khan is a clinical psychologist specializing in neurodiversity support. She leads our Little Soul Project, providing specialized care for children and adults with ADHD, autism, and related conditions.",
    services: ["neurodiversity-support", "psychological-training"],
  },
  {
    name: "Dr. Michael Chen",
    email: "michael.chen@lifeways.com",
    phone: "+92 303 4567890",
    license_no: "PMC-78904",
    specialization: "Physiotherapy",
    qualification: "DPT, FCPT (Physical Therapy)",
    role: "Therapist",
    experience: 10,
    consultation_fee: 2500,
    patients_treated: 980,
    success_rate: 90,
    gender: "Male",
    about: "Dr. Michael Chen is a licensed physiotherapist with expertise in physical rehabilitation. He specializes in musculoskeletal rehabilitation, post-surgical recovery, and mobility enhancement programs.",
    services: ["physiotherapy"],
  },
  {
    name: "Dr. Fatima Hassan",
    email: "fatima.hassan@lifeways.com",
    phone: "+92 304 5678901",
    license_no: "PMC-78905",
    specialization: "Cognitive Behavioral Therapy",
    qualification: "MSc Clinical Psychology, CBT Certified",
    role: "Psychologist",
    experience: 7,
    consultation_fee: 2800,
    patients_treated: 540,
    success_rate: 94,
    gender: "Female",
    about: "Dr. Fatima Hassan is a CBT specialist focusing on anxiety disorders, depression, and trauma recovery. She uses evidence-based cognitive behavioral techniques to help patients achieve lasting mental wellness.",
    services: ["psychological-training", "addiction-therapy"],
  },
];

const DEFAULT_AVAILABILITY = [
  { day: "Monday", hours: "09:00 - 17:00" },
  { day: "Tuesday", hours: "09:00 - 17:00" },
  { day: "Wednesday", hours: "09:00 - 17:00" },
  { day: "Thursday", hours: "09:00 - 17:00" },
  { day: "Friday", hours: "09:00 - 17:00" },
];

async function seedDoctors() {
  console.log("🌱 Seeding doctors...");

  for (let i = 0; i < DOCTORS.length; i++) {
    const doctorData = DOCTORS[i];
    const imageUrl = DOCTOR_IMAGES[i];

    try {
      // Generate temporary password
      const tempPassword = `Temp@${Math.random().toString(36).slice(2, 8)}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user account
      const user = await prisma.users.upsert({
        where: { email: doctorData.email },
        update: {
          name: doctorData.name,
          password: hashedPassword,
          role: "DOCTOR",
          is_active: true,
        },
        create: {
          email: doctorData.email,
          name: doctorData.name,
          password: hashedPassword,
          role: "DOCTOR",
          is_active: true,
        },
      });

      // Create doctor profile
      const doctor = await prisma.doctors.upsert({
        where: { license_no: doctorData.license_no },
        update: {
          user_id: user.id,
          experience_years: doctorData.experience,
          specialization: doctorData.specialization,
          qualification: doctorData.qualification,
          consultation_fee: doctorData.consultation_fee,
          rating: 4.5,
          is_approved: true,
          about: doctorData.about,
          availability_schedule: DEFAULT_AVAILABILITY,
          doctor_role: doctorData.role,
          image_url: imageUrl,
          patients_treated: doctorData.patients_treated,
          success_rate: doctorData.success_rate,
          gender: doctorData.gender,
        },
        create: {
          user_id: user.id,
          license_no: doctorData.license_no,
          experience_years: doctorData.experience,
          specialization: doctorData.specialization,
          qualification: doctorData.qualification,
          consultation_fee: doctorData.consultation_fee,
          rating: 4.5,
          is_approved: true,
          about: doctorData.about,
          availability_schedule: DEFAULT_AVAILABILITY,
          doctor_role: doctorData.role,
          image_url: imageUrl,
          patients_treated: doctorData.patients_treated,
          success_rate: doctorData.success_rate,
          gender: doctorData.gender,
        },
      });

      // Add phone number
      await prisma.user_phones.upsert({
        where: { id: -1 }, // Dummy where clause for upsert
        create: {
          user_id: user.id,
          phone: doctorData.phone,
        },
        update: {},
      });

      // Assign services
      for (const serviceSlug of doctorData.services) {
        const service = await prisma.rehabilitation_services.findUnique({
          where: { slug: serviceSlug },
        });

        if (service) {
          await prisma.doctor_service.upsert({
            where: {
              doctor_id_service_id: {
                doctor_id: doctor.id,
                service_id: service.id,
              },
            },
            update: {},
            create: {
              doctor_id: doctor.id,
              service_id: service.id,
            },
          });
        }
      }

      console.log(`✅ Created doctor: ${doctorData.name} (${doctorData.specialization})`);
      console.log(`   Email: ${doctorData.email}`);
      console.log(`   Temp Password: ${tempPassword}`);
      console.log(`   Services: ${doctorData.services.join(", ")}`);
      console.log("");
    } catch (error) {
      console.error(`❌ Error creating doctor ${doctorData.name}:`, error.message);
    }
  }

  console.log("🎉 Doctor seeding completed!");
}

seedDoctors()
  .catch((err) => {
    console.error("❌ Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
