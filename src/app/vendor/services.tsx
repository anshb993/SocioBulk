import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import {
  createServiceWithTiers,
  createVendorProfile,
  getMyVendor,
  listVendorServices,
} from '../../api/services';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { useAuthStore } from '../../store/authStore';
import type { TierTemplateInput } from '../../types/database';

interface TierDraft {
  min: string;
  max: string;
  price: string;
}

const DEFAULT_TIERS: TierDraft[] = [
  { min: '1', max: '9', price: '700' },
  { min: '10', max: '19', price: '650' },
  { min: '20', max: '', price: '600' },
];

export default function VendorServicesScreen() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();

  // Vendor profile form state
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');

  // Service form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('AC Servicing');
  const [individualPrice, setIndividualPrice] = useState('750');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [tiers, setTiers] = useState<TierDraft[]>(DEFAULT_TIERS);
  const [message, setMessage] = useState<string | null>(null);

  const vendorQuery = useQuery({
    queryKey: ['my-vendor', userId],
    queryFn: () => getMyVendor(userId!),
    enabled: Boolean(userId),
  });

  const vendorId = vendorQuery.data?.id;

  const servicesQuery = useQuery({
    queryKey: ['vendor-services', vendorId],
    queryFn: () => listVendorServices(vendorId!),
    enabled: Boolean(vendorId),
  });

  const createVendorMutation = useMutation({
    mutationFn: () =>
      createVendorProfile({
        userId: userId!,
        businessName,
        city,
        description,
      }),
    onSuccess: async () => {
      setMessage('Vendor profile created.');
      await queryClient.invalidateQueries({ queryKey: ['my-vendor', userId] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const createServiceMutation = useMutation({
    mutationFn: async () => {
      const parsedIndividual = Number(individualPrice);
      const parsedDuration = Number(durationMinutes);

      if (!title.trim() || !category.trim()) {
        throw new Error('Enter both a service title and category.');
      }
      if (!Number.isInteger(parsedIndividual) || parsedIndividual <= 0) {
        throw new Error('Individual price must be a positive whole number.');
      }
      if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
        throw new Error('Duration must be a positive number of minutes.');
      }

      const parsedTiers: TierTemplateInput[] = tiers.map((t, idx) => {
        const minVal = Number(t.min);
        const priceVal = Number(t.price);
        const maxVal = t.max.trim() === '' ? null : Number(t.max);

        if (!Number.isInteger(minVal) || minVal < 1) {
          throw new Error(`Tier ${idx + 1}: min participants must be >= 1.`);
        }
        if (maxVal !== null && (!Number.isInteger(maxVal) || maxVal < minVal)) {
          throw new Error(`Tier ${idx + 1}: max participants must be >= min or blank.`);
        }
        if (!Number.isInteger(priceVal) || priceVal <= 0) {
          throw new Error(`Tier ${idx + 1}: price must be > 0.`);
        }

        return {
          min_participants: minVal,
          max_participants: maxVal,
          price_per_person: priceVal,
        };
      });

      return createServiceWithTiers({
        vendorId: vendorId!,
        title,
        category,
        individualPrice: parsedIndividual,
        durationMinutes: parsedDuration,
        tiers: parsedTiers,
      });
    },
    onSuccess: async () => {
      setMessage('Service and pricing tiers saved.');
      setTitle('');
      setTiers(DEFAULT_TIERS);
      await queryClient.invalidateQueries({ queryKey: ['vendor-services', vendorId] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const updateTierField = (index: number, field: keyof TierDraft, value: string) => {
    setTiers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addTierRow = () => {
    const last = tiers[tiers.length - 1];
    const nextMin =
      last && last.max.trim() !== '' && Number.isInteger(Number(last.max))
        ? String(Number(last.max) + 1)
        : '';
    setTiers((prev) => [...prev, { min: nextMin, max: '', price: '' }]);
  };

  if (vendorQuery.isLoading) {
    return (
      <Screen>
        <ActivityIndicator className="mt-10" />
      </Screen>
    );
  }

  if (!vendorQuery.data) {
    return (
      <Screen>
        <Text className="mt-6 text-3xl font-bold text-ink">Vendor Setup</Text>
        <Text className="mt-1 text-muted">Create your business profile to add services.</Text>

        <Card className="mt-4">
          <Text className="text-sm font-medium text-ink">Business Name</Text>
          <TextInput
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="CoolCare Services"
            placeholderTextColor="#6B6882"
            className="mt-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
          />

          <Text className="mt-3 text-sm font-medium text-ink">City</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Margao"
            placeholderTextColor="#6B6882"
            className="mt-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
          />

          <Text className="mt-3 text-sm font-medium text-ink">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Split & window AC servicing and gas top-up"
            placeholderTextColor="#6B6882"
            className="mt-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
          />

          {message && <Text className="mt-3 text-sm text-primary-dark">{message}</Text>}

          <View className="mt-4">
            <Button
              label={createVendorMutation.isPending ? 'Saving...' : 'Create Vendor Profile'}
              onPress={() => {
                setMessage(null);
                createVendorMutation.mutate();
              }}
              disabled={createVendorMutation.isPending}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  const services = servicesQuery.data ?? [];

  return (
    <Screen>
      <Text className="mt-6 text-3xl font-bold text-ink">Services & Tiers</Text>
      <Text className="mt-1 text-muted">
        {vendorQuery.data.business_name} · {vendorQuery.data.city}
      </Text>

      <Card className="mt-4">
        <Text className="text-lg font-semibold text-ink">New Service</Text>

        <Text className="mt-3 text-sm font-medium text-ink">Service Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Split AC Deep Service"
          placeholderTextColor="#6B6882"
          className="mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
        />

        <View className="mt-3 flex-row gap-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-ink">Category</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="AC Servicing"
              placeholderTextColor="#6B6882"
              className="mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
            />
          </View>
          <View className="w-28">
            <Text className="text-sm font-medium text-ink">Mins</Text>
            <TextInput
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor="#6B6882"
              className="mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
            />
          </View>
        </View>

        <Text className="mt-3 text-sm font-medium text-ink">Individual Price (₹)</Text>
        <TextInput
          value={individualPrice}
          onChangeText={setIndividualPrice}
          keyboardType="numeric"
          placeholder="750"
          placeholderTextColor="#6B6882"
          className="mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
        />

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-ink">Pricing Tiers (leave max blank for +)</Text>
          <Pressable onPress={addTierRow}>
            <Text className="text-sm font-semibold text-primary">+ Add Tier</Text>
          </Pressable>
        </View>

        <View className="mt-2 gap-2">
          {tiers.map((tier, idx) => (
            <View key={idx} className="flex-row items-center gap-2">
              <TextInput
                value={tier.min}
                onChangeText={(val) => updateTierField(idx, 'min', val)}
                keyboardType="numeric"
                placeholder="Min"
                placeholderTextColor="#6B6882"
                className="w-16 rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-ink"
              />
              <Text className="text-muted">to</Text>
              <TextInput
                value={tier.max}
                onChangeText={(val) => updateTierField(idx, 'max', val)}
                keyboardType="numeric"
                placeholder="Max"
                placeholderTextColor="#6B6882"
                className="w-16 rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-ink"
              />
              <TextInput
                value={tier.price}
                onChangeText={(val) => updateTierField(idx, 'price', val)}
                keyboardType="numeric"
                placeholder="₹/person"
                placeholderTextColor="#6B6882"
                className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-ink"
              />
              {tiers.length > 1 && (
                <Pressable
                  onPress={() => setTiers((prev) => prev.filter((_, i) => i !== idx))}
                  className="px-2 py-1"
                >
                  <Text className="font-semibold text-rust">✕</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {message && <Text className="mt-3 text-sm text-primary-dark">{message}</Text>}

        <View className="mt-4">
          <Button
            label={createServiceMutation.isPending ? 'Saving Service...' : 'Save Service'}
            onPress={() => {
              setMessage(null);
              createServiceMutation.mutate();
            }}
            disabled={createServiceMutation.isPending}
          />
        </View>
      </Card>

      <Text className="mt-6 text-lg font-semibold text-ink">Your Services</Text>

      {servicesQuery.isLoading ? (
        <ActivityIndicator className="mt-4" />
      ) : services.length === 0 ? (
        <Card className="mt-3">
          <Text className="text-muted">No services created yet.</Text>
        </Card>
      ) : (
        services.map((svc) => (
          <Card key={svc.id} className="mt-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-ink">{svc.title}</Text>
                <Text className="text-xs text-muted">
                  {svc.category} · {svc.duration_minutes} mins
                </Text>
              </View>
              <Badge label={`₹${svc.individual_price} solo`} tone="gold" />
            </View>

            <View className="mt-3 gap-1">
              {svc.service_tier_templates.map((t) => (
                <Text key={t.id} className="text-sm text-ink">
                  • {t.max_participants ? `${t.min_participants}–${t.max_participants}` : `${t.min_participants}+`}{' '}
                  residents: <Text className="font-semibold text-primary-dark">₹{t.price_per_person}</Text>
                </Text>
              ))}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}