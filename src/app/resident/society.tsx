import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { getMyMemberships, listSocieties, requestMembership } from '../../api/societies';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { useAuthStore } from '../../store/authStore';

export default function ResidentSocietyScreen() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const [selectedSocietyId, setSelectedSocietyId] = useState<string | null>(null);
  const [wing, setWing] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const societiesQuery = useQuery({
    queryKey: ['societies'],
    queryFn: listSocieties,
    enabled: Boolean(userId),
  });

  const membershipsQuery = useQuery({
    queryKey: ['my-memberships', userId],
    queryFn: () => getMyMemberships(userId!),
    enabled: Boolean(userId),
  });

  const joinMutation = useMutation({
    mutationFn: () =>
      requestMembership({
        societyId: selectedSocietyId!,
        userId: userId!,
        wing,
        flatNumber,
      }),
    onSuccess: async () => {
      setFeedback('Membership request sent. Waiting for society admin approval.');
      setWing('');
      setFlatNumber('');
      setSelectedSocietyId(null);
      await queryClient.invalidateQueries({ queryKey: ['my-memberships', userId] });
    },
    onError: (err: Error) => {
      setFeedback(err.message);
    },
  });

  const memberships = membershipsQuery.data ?? [];
  const adminMembership = memberships.find((m) => m.status === 'approved' && m.is_admin);
  const existingSocietyIds = new Set(memberships.map((m) => m.society_id));
  const availableSocieties = (societiesQuery.data ?? []).filter(
    (s) => !existingSocietyIds.has(s.id)
  );

  const handleSubmitRequest = () => {
    setFeedback(null);
    if (!selectedSocietyId) {
      setFeedback('Select a society first.');
      return;
    }
    if (!wing.trim() || !flatNumber.trim()) {
      setFeedback('Enter both wing and flat number.');
      return;
    }
    joinMutation.mutate();
  };

  return (
    <Screen>
      <Text className="mt-6 text-3xl font-bold text-ink">My Society</Text>
      <Text className="mt-1 text-muted">Join your apartment society to view and join campaigns.</Text>

      {adminMembership && (
        <Card className="mt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-ink">Society Admin Access</Text>
              <Text className="text-sm text-muted">
                You are an admin for {adminMembership.societies?.name ?? 'your society'}.
              </Text>
            </View>
            <Badge label="Admin" tone="gold" />
          </View>
          <View className="mt-3">
            <Button
              label="Open Society Admin"
              onPress={() => router.push('/society-admin/dashboard')}
            />
          </View>
        </Card>
      )}

      <Text className="mt-6 text-lg font-semibold text-ink">Your Memberships</Text>

      {membershipsQuery.isLoading ? (
        <ActivityIndicator className="mt-4" />
      ) : memberships.length === 0 ? (
        <Card className="mt-3">
          <Text className="text-muted">You have not joined or requested any society yet.</Text>
        </Card>
      ) : (
        memberships.map((m) => {
          const badgeTone =
            m.status === 'approved' ? 'gold' : m.status === 'rejected' ? 'rust' : 'rust';
          return (
            <Card key={m.id} className="mt-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-ink">
                    {m.societies?.name ?? m.society_id}
                  </Text>
                  <Text className="text-sm text-muted">
                    {m.societies?.area}, {m.societies?.city}
                  </Text>
                  <Text className="mt-1 text-sm font-medium text-ink">
                    Wing {m.wing} · Flat {m.flat_number}
                    {m.is_admin ? ' · Society Admin' : ''}
                  </Text>
                </View>
                <Badge label={m.status} tone={badgeTone} />
              </View>
            </Card>
          );
        })
      )}

      <Text className="mt-6 text-lg font-semibold text-ink">Request to Join a Society</Text>

      {societiesQuery.isLoading ? (
        <ActivityIndicator className="mt-4" />
      ) : availableSocieties.length === 0 ? (
        <Card className="mt-3">
          <Text className="text-muted">
            No additional societies available to request right now.
          </Text>
        </Card>
      ) : (
        <Card className="mt-3">
          <Text className="text-sm font-medium text-ink">1. Choose Society</Text>
          <View className="mt-2 gap-2">
            {availableSocieties.map((soc) => {
              const selected = soc.id === selectedSocietyId;
              return (
                <Pressable
                  key={soc.id}
                  onPress={() => setSelectedSocietyId(soc.id)}
                  className={`rounded-xl border p-3 ${
                    selected ? 'border-primary bg-tint' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text className="font-semibold text-ink">{soc.name}</Text>
                  <Text className="text-xs text-muted">
                    {soc.area}, {soc.city} - {soc.pincode}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-4 text-sm font-medium text-ink">2. Wing & Flat Number</Text>
          <View className="mt-2 flex-row gap-3">
            <TextInput
              value={wing}
              onChangeText={setWing}
              placeholder="Wing (e.g. A)"
              placeholderTextColor="#6B6882"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
            />
            <TextInput
              value={flatNumber}
              onChangeText={setFlatNumber}
              placeholder="Flat (e.g. 402)"
              placeholderTextColor="#6B6882"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-ink"
            />
          </View>

          {feedback && <Text className="mt-3 text-sm text-primary-dark">{feedback}</Text>}

          <View className="mt-4">
            <Button
              label={joinMutation.isPending ? 'Sending Request...' : 'Request Membership'}
              onPress={handleSubmitRequest}
              disabled={joinMutation.isPending}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}