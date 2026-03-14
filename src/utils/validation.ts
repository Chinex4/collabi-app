import * as yup from 'yup';

import { OTP_LENGTH, REPORT_REASONS } from '@/constants';

export const loginSchema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(6, 'Minimum of 6 characters').required('Password is required'),
});

export const registerSchema = yup.object({
  fullName: yup.string().required('Full name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(6, 'Minimum of 6 characters').required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm your password'),
  facultyId: yup.string().required('Select a faculty'),
  departmentId: yup.string().required('Select a department'),
  level: yup.string().required('Select a level'),
});

export const otpSchema = yup.object({
  otp: yup
    .string()
    .length(OTP_LENGTH, `Enter the ${OTP_LENGTH}-digit code`)
    .required('OTP is required'),
});

export const forgotPasswordSchema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
});

export const resetPasswordSchema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  otp: yup
    .string()
    .length(OTP_LENGTH, `Enter the ${OTP_LENGTH}-digit code`)
    .required('OTP is required'),
  password: yup.string().min(6, 'Minimum of 6 characters').required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm your password'),
});

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup.string().min(6, 'Minimum of 6 characters').required('New password is required'),
  confirmNewPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Confirm your new password'),
});

export const profileSchema = yup.object({
  bio: yup.string().required('Bio is required'),
  availability: yup.string().required('Select availability'),
  visibility: yup.string().required('Select visibility'),
  preferredRoles: yup.array(yup.string()).min(1, 'Choose at least one preferred role'),
  skills: yup.array(yup.string()).min(1, 'Select at least one skill'),
  interests: yup.array(yup.string()).min(1, 'Select at least one interest'),
  portfolioLinks: yup.string().default(''),
});

export const projectSchema = yup.object({
  title: yup.string().required('Project title is required'),
  description: yup.string().required('Project description is required'),
  categoryId: yup.string().required('Select a category'),
  departmentId: yup.string().required('Select a department'),
  facultyId: yup.string().required('Select a faculty'),
  requiredSkillIds: yup.array(yup.string()).min(1, 'Choose required skills'),
  optionalSkillIds: yup.array(yup.string()).default([]),
  teamSizeLimit: yup.number().min(2).max(10).required('Team size is required'),
  deadline: yup.string().required('Select a deadline'),
  visibility: yup.string().required('Select visibility'),
  tags: yup.array(yup.string()).default([]),
});

export const taskSchema = yup.object({
  title: yup.string().required('Task title is required'),
  description: yup.string().required('Task description is required'),
  assignedMemberIds: yup.array(yup.string()).min(1, 'Assign at least one member'),
  priority: yup.string().required('Select priority'),
  status: yup.string().required('Select status'),
  dueDate: yup.string().required('Select due date'),
  progress: yup.number().min(0).max(100).required('Set progress'),
});

export const inviteSchema = yup.object({
  studentId: yup.string().required('Select a student'),
  message: yup.string().required('Write a short invite note'),
});

export const applicationSchema = yup.object({
  message: yup.string().required('Add a short application note'),
});

export const reportSchema = yup.object({
  reason: yup
    .string()
    .oneOf(REPORT_REASONS, 'Select a valid reason')
    .required('Reason is required'),
  description: yup.string().optional(),
});

export const settingSchema = yup.object({
  label: yup.string().required('Label is required'),
  value: yup.string().required('Value is required'),
  description: yup.string().required('Description is required'),
  category: yup.string().required('Category is required'),
});

export const announcementSchema = yup.object({
  title: yup.string().required('Title is required'),
  body: yup.string().required('Announcement body is required'),
  audience: yup.string().required('Select audience'),
});
