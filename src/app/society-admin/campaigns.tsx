import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import {
  confirmCampaign,
  createCampaignWithTiers,
  listActiveServicesForCampaign,
  listSocietyCampaigns,
} from '../../api/campaigns';
import { getMyMemberships } from '../../api/societies';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { useCampaignRealtime } from '../../hooks/useCampaignRealtime';
import { useAuthStore } from '../../store/authStore';

function defaultFutureDate(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function SocietyAdminCampaignsScreen() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minParticipants, setMinParticipants] = useState('5');
  const [maxParticipants, setMaxParticipants] = useState('30');
  const [joinDeadlineDate, setJoinDeadlineDate] = useState(() => defaultFutureDate(3));
  const [paymentDeadlineDate, setPaymentDeadlineDate] = useState(() => defaultFutureDate(5));
  const [serviceDate, setServiceDate] = useState(() => defaultFutureDate(7));
  const [message, setMessage] = useState<string | null>(null);

  const membershipsQuery = useQuery({
    queryKey: ['my-memberships', userId],
    queryFn: () => getMyMemberships(userId!),
    enabled: Boolean(userId),
  });

  const adminMembership = (membershipsQuery.data ?? []).find(
    (m) => m.status === 'approved' && m.is_admin
  );
  const societyId = adminMembership?.society_id;

  useCampaignRealtime(undefined, societyId);

  const servicesQuery = useQuery({
    queryKey: ['active-services-catalog'],
    queryFn: listActiveServicesForCampaign,
    enabled: Boolean(societyId),
  });

  const campaignsQuery = useQuery({
    queryKey: ['society-campaigns', societyId],
    queryFn: () => listSocietyCampaigns(societyId!, userId),
    enabled: Boolean(societyId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!societyId) throw new Error('No admin society found.');
      if (!selectedServiceId) throw new Error('Select a vendor service first.');
      if (!title.trim()) throw new Error('Enter a campaign title.');

      const minP = Number(minParticipants);
      const maxP = Number(maxParticipants);
      if (!Number.isInteger(minP) || minP < 1) {
        throw new Error('Min participants must be at least 1.');
      }
      if (!Number.isInteger(maxP) || maxP < minP) {
        throw new Error('Max participants must be >= min participants.');
      }

      const joinIso = new Date(`${joinDeadlineDate.trim()}T23:59:59Z`).toISOString();
      const paymentIso = new Date(`${paymentDeadlineDate.trim()}T23:59:59Z`).toISOString();
      const cleanServiceDate = serviceDate.trim();

      if (Number.isNaN(Date.parse(joinIso)) || Number.isNaN(Date.parse(paymentIso))) {
        throw new Error('Use YYYY-MM-DD format for deadlines.');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanServiceDate)) {
        throw new Error('Use YYYY-MM-DD format for service date.');
      }

      return createCampaignWithTiers({
        societyId,
        serviceId: selectedServiceId,
        title,
        description,
        minParticipants: minP,
        maxParticipants: maxP,
        joinDeadlineIso: joinIso,
        paymentDeadlineIso: paymentIso,
        serviceDate: cleanServiceDate,
        publish: true,
      });
    },
    onSuccess: async () => {
      setMessage('Campaign published with tier snapshot.');
      setTitle('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['society-campaigns', societyId] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const confirmMutation = useMutation({
    mutationFn: (campaignId: string) => confirmCampaign(campaignId),
    onSuccess: async (lockedPrice) => {
      setMessage(`Campaign confirmed! Price locked at ₹${lockedPrice} per resident.`);
      await queryClient.invalidateQueries({ queryKey: ['society-campaigns', societyId] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  if (membershipsQuery.isLoading) {
    return (
      <Screen>
        <ActivityIndicator className="mt-10" />
      </Screen>
    );
  }

  if (!societyId) {
    return (
      <Screen>
        <Text className="mt-6 text-3xl font-bold text-ink">Campaigns</Text>
        <Card className="mt-4">
          <Text className="text-muted">You are not an approved society admin.</Text>
        </Card>
      </Screen>
    );
  }

  const services = servicesQuery.data ?? [];
  const campaigns = campaignsQuery.data ?? [];

  return (
    <Screen>
      <Text className="mt-6 text-3xl font-bold text-ink">Campaigns</Text>
      <Text className="mt-1 text-muted">
        {adminMembership?.societies?.name ?? 'Society'} · Publish and confirm group buys
      </Text>

      <Card className="mt-4">
        <Text className="text-lg font-semibold text-ink">Launch New Campaign</Text>

        <Text className="mt-3 text-sm font-medium text-ink">1. Select Vendor Service</Text>
        {servicesQuery.isLoading ? (
          <ActivityIndicator className="mt-2" />
        ) : services.length === 0 ? (
          <Text className="mt-1 text-sm text-muted">
            No active vendor services found. Create one as a vendor first.
          </Text>
        ) : (
          <View className="mt-2 gap-2">
            {services.map((svc) => {
              const selected = svc.id === selectedServiceId;
              return (
                <Pressable
                  key={svc.id}
                  onPress={() => {
                    setSelectedServiceId(svc.id);
                    if (!title.trim()) setTitle(svc.title);
                  }}
                  className={`rounded-xl border p-3 ${
                    selected ? 'border-primary bg-tint' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text className="font-semibold text-ink">{svc.title}</Text>
                  <Text className="text-xs text-muted">
                    {svc.vendor_name} · {svc.category} · Solo ₹{svc.individual_price}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text className="mt-3 text-sm font-medium text-ink">2. Campaign Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Weekend Split AC Servicing"
          placeholderTextColor="#6B6882"
          className="mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
        />

        <Text className="mt-3 text-sm font-medium text-ink">Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Includes indoor coil wash and outdoor jet cleaning"
          placeholderTextColor="#6B6882"
          className="mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
        />

        <View className="mt-3 flex-row gap-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-ink">Min Residents</Text>
            <TextInput
              value={minParticipants}
              onChangeText={setMinParticipants}
              keyboardType="numeric"
              className="mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-ink"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-ink">Max Residents</Text>
            <TextInput
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="numeric"
              className="mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-ink"
            />
          </View>
        </View>

        <View className="mt-3 flex-row gap-2">
          <View className="flex-1">
            <Text className="text-xs font-medium text-ink">Join Deadline</Text>
            <TextInput
              value={joinDeadlineDate}
              onChangeText={setJoinDeadlineDate}
              placeholder="YYYY-MM-DD"
              className="mt-1 rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-xs text-ink"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-medium text-ink">Pay Deadline</Text>
            <TextInput
              value={paymentDeadlineDate}
              onChangeText={setPaymentDeadlineDate}
              placeholder="YYYY-MM-DD"
              className="mt-1 rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-xs text-ink"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-medium text-ink">Service Date</Text>
            <TextInput
              value={serviceDate}
              onChangeText={setServiceDate}
              placeholder="YYYY-MM-DD"
              className="mt-1 rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-xs text-ink"
            />
          </View>
        </View>

        {message && <Text className="mt-3 text-sm text-primary-dark">{message}</Text>}

        <View className="mt-4">
          <Button
            label={createMutation.isPending ? 'Publishing...' : 'Publish Campaign'}
            onPress={() => {
              setMessage(null);
              createMutation.mutate();
            }}
            disabled={createMutation.isPending}
          />
        </View>
      </Card>

      <Text className="mt-6 text-lg font-semibold text-ink">Society Campaigns</Text>

      {campaignsQuery.isLoading ? (
        <ActivityIndicator className="mt-4" />
      ) : campaigns.length === 0 ? (
        <Card className="mt-3">
          <Text className="text-muted">No campaigns created yet.</Text>
        </Card>
      ) : (
        campaigns.map((c) => {
          const currentPrice = c.pricing?.current_price ?? c.individual_price;
          const canConfirm = c.status === 'open' && c.current_participants >= c.min_participants;
          return (
            <Card key={c.id} className="mt-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-ink">{c.title}</Text>
                  <Text className="text-xs text-muted">
                    {c.services?.vendors?.business_name ?? 'Vendor'} · Service {c.service_date}
                  </Text>
                </View>
                <Badge label={c.status} tone={c.status === 'confirmed' ? 'gold' : 'rust'} />
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-sm text-ink">
                  Joined:{' '}
                  <Text className="font-semibold">
                    {c.current_participants}/{c.max_participants}
                  </Text>{' '}
                  (min {c.min_participants})
                </Text>
                <Text className="text-base font-bold text-primary-dark">₹{currentPrice}/person</Text>
              </View>

              {c.status === 'open' && (
                <View className="mt-3">
                  <Button
                    label={
                      canConfirm
                        ? `Confirm & Lock at ₹${currentPrice}`
                        : `Need ${c.min_participants - c.current_participants} more to confirm`
                    }
                    onPress={() => {
                      setMessage(null);
                      confirmMutation.mutate(c.id);
                    }}
                    disabled={!canConfirm || confirmMutation.isPending}
                  />
                </View>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}