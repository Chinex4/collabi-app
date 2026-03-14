import { yupResolver } from '@hookform/resolvers/yup';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Controller, FieldValues, UseFormProps, useForm } from 'react-hook-form';
import { Pressable, TextInput, View } from 'react-native';

import { AppButton, AppInput, AppText, Chip } from '@/components/common';
import { cn, formatDate } from '@/utils/helpers';

type FormFieldProps = {
  control: any;
  name: string;
  label: string;
};

export const useAppForm = <T extends FieldValues>(
  options: UseFormProps<T> & { schema?: unknown }
) =>
  useForm<T>({
    ...options,
    resolver: options.schema ? (yupResolver(options.schema as never) as any) : options.resolver,
  });

const FieldShell = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <View className="mb-4">
    <AppText className="mb-2 text-sm font-medium text-slate-700">{label}</AppText>
    {children}
    {error ? <AppText className="mt-2 text-xs text-rose-600">{error}</AppText> : null}
  </View>
);

export const FormTextInput = ({
  control,
  name,
  label,
  placeholder,
  keyboardType,
}: FormFieldProps & {
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric';
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <FieldShell label={label} error={error?.message}>
        <AppInput
          value={String(value ?? '')}
          onChangeText={onChange}
          placeholder={placeholder}
          keyboardType={keyboardType}
        />
      </FieldShell>
    )}
  />
);

export const FormPasswordInput = ({
  control,
  name,
  label,
  placeholder,
}: FormFieldProps & {
  placeholder?: string;
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <FieldShell label={label} error={error?.message}>
        <AppInput
          value={String(value ?? '')}
          onChangeText={onChange}
          placeholder={placeholder}
          secureTextEntry
        />
      </FieldShell>
    )}
  />
);

export const FormTextArea = ({
  control,
  name,
  label,
  placeholder,
}: FormFieldProps & {
  placeholder?: string;
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <FieldShell label={label} error={error?.message}>
        <AppInput
          value={String(value ?? '')}
          onChangeText={onChange}
          placeholder={placeholder}
          multiline
        />
      </FieldShell>
    )}
  />
);

export const FormSelect = ({
  control,
  name,
  label,
  options,
}: FormFieldProps & {
  options: { label: string; value: string }[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <FieldShell label={label} error={error?.message}>
          <Pressable
            onPress={() => setOpen((current) => !current)}
            className="rounded-2xl border border-violet-200 bg-white px-4 py-3">
            <AppText className={value ? 'text-slate-900' : 'text-slate-400'}>
              {options.find((item) => item.value === value)?.label ??
                `Select ${label.toLowerCase()}`}
            </AppText>
          </Pressable>
          {open ? (
            <View className="mt-2 rounded-2xl border border-violet-100 bg-white p-2">
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="rounded-xl px-3 py-3">
                  <AppText
                    className={cn(
                      'text-sm',
                      value === option.value ? 'font-semibold text-violet-700' : 'text-slate-700'
                    )}>
                    {option.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </FieldShell>
      )}
    />
  );
};

export const FormMultiSelect = ({
  control,
  name,
  label,
  options,
}: FormFieldProps & {
  options: { label: string; value: string }[];
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, value = [] }, fieldState: { error } }) => {
      const selected = Array.isArray(value) ? value : [];
      return (
        <FieldShell label={label} error={error?.message}>
          <View className="flex-row flex-wrap rounded-2xl border border-violet-200 bg-white p-3">
            {options.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={isSelected}
                  onPress={() => {
                    if (isSelected) {
                      onChange(selected.filter((item) => item !== option.value));
                    } else {
                      onChange([...selected, option.value]);
                    }
                  }}
                />
              );
            })}
          </View>
        </FieldShell>
      );
    }}
  />
);

export const FormDatePicker = ({ control, name, label }: FormFieldProps) => {
  const [show, setShow] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <FieldShell label={label} error={error?.message}>
          <Pressable
            onPress={() => setShow(true)}
            className="rounded-2xl border border-violet-200 bg-white px-4 py-3">
            <AppText>{value ? formatDate(String(value)) : 'Pick a date'}</AppText>
          </Pressable>
          {show ? (
            <DateTimePicker
              mode="date"
              value={value ? new Date(String(value)) : new Date()}
              onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                setShow(false);
                if (event.type === 'set' && selectedDate) {
                  onChange(selectedDate.toISOString());
                }
              }}
            />
          ) : null}
        </FieldShell>
      )}
    />
  );
};

export const FormOtpInput = ({
  control,
  name,
  label,
  length = 6,
}: FormFieldProps & {
  length?: number;
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, value }, fieldState: { error } }) => {
      const text = String(value ?? '');
      return (
        <FieldShell label={label} error={error?.message}>
          <View className="items-center">
            <TextInput
              value={text}
              onChangeText={onChange}
              keyboardType="numeric"
              maxLength={length}
              className="absolute inset-0 opacity-0"
            />
            <View className="flex-row gap-2">
              {Array.from({ length }).map((_, index) => (
                <View
                  key={index}
                  className="h-12 w-11 items-center justify-center rounded-2xl border border-violet-200 bg-white">
                  <AppText className="text-lg font-semibold text-slate-900">
                    {text[index] ?? ''}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </FieldShell>
      );
    }}
  />
);

export const FormTagInput = ({
  control,
  name,
  label,
  placeholder = 'Add tag and press enter',
}: FormFieldProps & {
  placeholder?: string;
}) => {
  const [draft, setDraft] = useState('');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value = [] }, fieldState: { error } }) => {
        const items = Array.isArray(value) ? value : [];
        return (
          <FieldShell label={label} error={error?.message}>
            <View className="rounded-2xl border border-violet-200 bg-white p-3">
              <View className="flex-row flex-wrap">
                {items.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    selected
                    onPress={() => onChange(items.filter((entry) => entry !== item))}
                  />
                ))}
              </View>
              <View className="mt-2 flex-row items-center gap-2">
                <View className="flex-1">
                  <AppInput value={draft} onChangeText={setDraft} placeholder={placeholder} />
                </View>
                <AppButton
                  label="Add"
                  onPress={() => {
                    if (!draft.trim()) {
                      return;
                    }
                    onChange([...items, draft.trim()]);
                    setDraft('');
                  }}
                />
              </View>
            </View>
          </FieldShell>
        );
      }}
    />
  );
};
