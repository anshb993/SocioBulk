import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { joinCampaign, listSocietyCampaigns } from '../../api/campaigns';
import { getMyMemberships } from '../../api/societies';
import { ParticipantRing } from '../../components/campaign/ParticipantRing';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { useCampaignRealtime } from '../../hooks/useCampaignRealtime';
import { useAuthStore } from '../../store/authStore';

function formatDeadlineBadge(joinDeadlineIso: string, status: string): {
  label: string;
  tone: 'gold' | 'rust';
} {
  if (status === 'confirmed') return { label: 'Price locked', tone: 'gold' };
  if (status !== 'open') return { label: status, tone: 'rust' };

  const diffMs = new Date(joinDeadlineIso).getTime() - Date.now();
  if (diffMs <= 0) return { label: 'Ending soon', tone: 'rust' };

  const hours = Math.ceil(diffMs / 3_600_000);
  if (hours < 24) return { label: `${hours}h left`, tone: 'rust' };
  const days = Math.ceil(diffMs / 86_400_000);
  return { label: `${days}d left`, tone: 'rust' };
}

export default function ResidentHomeScreen() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const membershipsQuery = useQuery({
    queryKey: ['my-memberships', userId],
    queryFn: () => getMyMemberships(userId!),
    enabled: Boolean(userId),
  });

  const approvedMembership = (membershipsQuery.data ?? []).find((m) => m.status === 'approved');
  const societyId = approvedMembership?.society_id;

  useCampaignRealtime(undefined, societyId);

  const campaignsQuery = useQuery({
    queryKey: ['society-campaigns', societyId, userId],
    queryFn: () => listSocietyCampaigns(societyId!, userId),
    enabled: Boolean(societyId),
  });

  const quickJoinMutation = useMutation({
    mutationFn: (campaignId: string) => joinCampaign(campaignId),
    onSuccess: async (_, campaignId) => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['society-campaigns', societyId] });
      await queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  if (membershipsQuery.isLoading) {
    return (
      <Screen>
        <ActivityIndicator className="mt-10" />
      </Screen>
    );
  }

  if (!approvedMembership || !societyId) {
    return (
      <Screen>
        <Text className="mt-6 text-3xl font-bold text-ink">Campaigns</Text>
        <Card className="mt-4">
          <Text className="text-base font-semibold text-ink">Join your society first</Text>
          <Text className="mt-1 text-muted">
            Once a society admin approves your flat membership, live group-buying campaigns will
            appear here.
          </Text>
          <View className="mt-4">
            <Button label="Go to My Society" onPress={() => router.push('/resident/society')} />
          </View>
        </Card>
      </Screen>
    );
  }

  const campaigns = campaignsQuery.data ?? [];

  return (
    <Screen>
      <Text className="mt-6 text-3xl font-bold text-ink">Campaigns</Text>
      <Text className="mt-1 text-muted">
        {approvedMembership.societies?.name ?? 'Your Society'} · Wing {approvedMembership.wing}-
        {approvedMembership.flat_number}
      </Text>

      {actionError && <Text className="mt-3 text-sm text-rust">{actionError}</Text>}

      {campaignsQuery.isLoading ? (
        <ActivityIndicator className="mt-6" />
      ) : campaigns.length === 0 ? (
        <Card className="mt-4">
          <Text className="text-muted">No campaigns running in your society yet.</Text>
        </Card>
      ) : (
        campaigns.map((c) => {
          const currentPrice = c.pricing?.current_price ?? c.individual_price;
          const savings = c.pricing?.savings ?? 0;
          const residentsNeeded = c.pricing?.residents_needed;
          const nextTierPrice = c.pricing?.next_tier_price;
          const badge = formatDeadlineBadge(c.join_deadline, c.status);

          return (
            <Pressable
              key={c.id}
              onPress={() =>
                router.push({
                  pathname: '/resident/campaign/[id]',
                  params: { id: c.id },
                })
              }
            >
              <Card className="mt-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-semibold text-ink">{c.title}</Text>
                    <Text className="text-muted">
                      {c.services?.vendors?.business_name ?? 'Vendor'} · Service {c.service_date}
                    </Text>
                  </View>
                  <Badge label={badge.label} tone={badge.tone} />
                </View>

                <View className="mt-4 flex-row items-center">
                  <ParticipantRing joined={c.current_participants} max={c.max_participants} />
                  <View className="ml-4 flex-1">
                    <View className="flex-row items-baseline gap-2">
                      <Text className="text-2xl font-bold text-primary-dark">₹{currentPrice}</Text>
                      <Text className="text-sm text-muted line-through">₹{c.individual_price}</Text>
                    </View>
                    <Text className="font-semibold text-gold">Save ₹{savings} each</Text>
                    {residentsNeeded != null && nextTierPrice != null && (
                      <Text className="mt-0.5 text-xs text-muted">
                        {residentsNeeded} more {residentsNeeded === 1 ? 'resident' : 'residents'} to
                        unlock ₹{nextTierPrice}
                      </Text>
                    )}
                  </View>
                </View>

                <View className="mt-4 flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      label={
                        c.isJoined
                          ? 'Joined ✓'
                          : c.status === 'open'
                            ? 'Join group'
                            : 'View details'
                      }
                      onPress={() => {
                        if (!c.isJoined && c.status === 'open') {
                          setActionError(null);
                          quickJoinMutation.mutate(c.id);
                        } else {
                          router.push({
                            pathname: '/resident/campaign/[id]',
                            params: { id: c.id },
                          });
                        }
                      }}
                      disabled={quickJoinMutation.isPending}
                    />
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}