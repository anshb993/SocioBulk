import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { getCampaignDetail, joinCampaign, leaveCampaign } from '../../../api/campaigns';
import { ParticipantRing } from '../../../components/campaign/ParticipantRing';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useCampaignRealtime } from '../../../hooks/useCampaignRealtime';
import { useAuthStore } from '../../../store/authStore';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaignId = Array.isArray(id) ? id[0] : id;
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  useCampaignRealtime(campaignId);

  const detailQuery = useQuery({
    queryKey: ['campaign-detail', campaignId, userId],
    queryFn: () => getCampaignDetail(campaignId!, userId),
    enabled: Boolean(campaignId),
  });

  const joinMutation = useMutation({
    mutationFn: () => joinCampaign(campaignId!),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      await queryClient.invalidateQueries({ queryKey: ['society-campaigns'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveCampaign(campaignId!),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      await queryClient.invalidateQueries({ queryKey: ['society-campaigns'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  if (detailQuery.isLoading || !detailQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4F46C8" />
      </View>
    );
  }

  const { campaign, tiers, pricing, isJoined } = detailQuery.data;
  const effectiveCount = Math.max(campaign.current_participants, 1);
  const joinDeadlineFormatted = new Date(campaign.join_deadline).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isBusy = joinMutation.isPending || leaveMutation.isPending;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-xl px-4 pb-32 pt-6"
      >
        <Pressable onPress={() => router.back()} className="mb-3 self-start py-1">
          <Text className="font-semibold text-primary">← Back to Campaigns</Text>
        </Pressable>

        {/* Header */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-bold text-ink">{campaign.title}</Text>
            <Text className="mt-0.5 text-muted">
              {campaign.services?.vendors?.business_name ?? 'Vendor'}
            </Text>
          </View>
          <Badge
            label={campaign.status === 'confirmed' ? 'Locked' : campaign.status}
            tone={campaign.status === 'confirmed' ? 'gold' : 'rust'}
          />
        </View>

        {campaign.description ? (
          <Text className="mt-2 text-sm text-muted">{campaign.description}</Text>
        ) : null}

        {/* Pricing & Progress Card */}
        <Card className="mt-4">
          <View className="flex-row items-center">
            <ParticipantRing
              joined={campaign.current_participants}
              max={campaign.max_participants}
            />
            <View className="ml-4 flex-1">
              <Text className="text-xs uppercase tracking-wide text-muted">
                {campaign.locked_price_per_person != null ? 'Locked Price' : 'Current Group Price'}
              </Text>
              <View className="mt-0.5 flex-row items-baseline gap-2">
                <Text className="text-3xl font-bold text-primary-dark">
                  ₹{pricing.current_price}
                </Text>
                <Text className="text-base text-muted line-through">
                  ₹{pricing.individual_price}
                </Text>
              </View>
              <Text className="mt-0.5 font-semibold text-gold">
                You save ₹{pricing.savings} per service
              </Text>
            </View>
          </View>

          {pricing.residents_needed != null && pricing.next_tier_price != null ? (
            <View className="mt-4 rounded-xl bg-tint px-3 py-2.5">
              <Text className="text-sm font-semibold text-primary-dark">
                {pricing.residents_needed} more{' '}
                {pricing.residents_needed === 1 ? 'resident' : 'residents'} needed to unlock ₹
                {pricing.next_tier_price}
              </Text>
            </View>
          ) : (
            <View className="mt-4 rounded-xl bg-tint px-3 py-2.5">
              <Text className="text-sm font-semibold text-primary-dark">
                {campaign.locked_price_per_person != null
                  ? 'Final price is locked for this campaign.'
                  : 'Best tier unlocked!'}
              </Text>
            </View>
          )}

          <View className="mt-4 flex-row justify-between border-t border-gray-100 pt-3">
            <View>
              <Text className="text-xs text-muted">Join Deadline</Text>
              <Text className="font-semibold text-ink">{joinDeadlineFormatted}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted">Service Date</Text>
              <Text className="font-semibold text-ink">{campaign.service_date}</Text>
            </View>
          </View>
        </Card>

        {/* Tier Ladder Card */}
        <Card className="mt-4">
          <Text className="text-base font-semibold text-ink">Group Pricing Tiers</Text>
          <Text className="text-xs text-muted">
            More neighbors joining lowers everyone&apos;s price
          </Text>

          <View className="mt-3 gap-2">
            {tiers.map((tier) => {
              const isCurrentTier =
                effectiveCount >= tier.min_participants &&
                (tier.max_participants === null || effectiveCount <= tier.max_participants);

              const rangeLabel =
                tier.max_participants != null
                  ? `${tier.min_participants}–${tier.max_participants} residents`
                  : `${tier.min_participants}+ residents`;

              return (
                <View
                  key={tier.id}
                  className={`flex-row items-center justify-between rounded-xl border px-3.5 py-3 ${
                    isCurrentTier ? 'border-primary bg-tint' : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    <Text
                      className={`font-semibold ${
                        isCurrentTier ? 'text-primary-dark' : 'text-ink'
                      }`}
                    >
                      {rangeLabel}
                    </Text>
                    {isCurrentTier && <Badge label="You're here" tone="gold" />}
                  </View>
                  <Text
                    className={`text-base font-bold ${
                      isCurrentTier ? 'text-primary-dark' : 'text-ink'
                    }`}
                  >
                    ₹{tier.price_per_person}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {actionError && <Text className="mt-3 text-sm text-rust">{actionError}</Text>}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View className="border-t border-gray-200 bg-white px-4 py-3">
        <View className="mx-auto w-full max-w-xl flex-row items-center justify-between gap-4">
          <View>
            <Text className="text-xs text-muted">
              {campaign.locked_price_per_person != null ? 'Locked Price' : 'Live Group Price'}
            </Text>
            <Text className="text-xl font-bold text-primary-dark">₹{pricing.current_price}</Text>
          </View>

          <View className="flex-1">
            {campaign.status !== 'open' ? (
              <Button
                label={isJoined ? 'Joined · Confirmed' : `Campaign ${campaign.status}`}
                disabled
              />
            ) : isJoined ? (
              <Button
                label={isBusy ? 'Leaving...' : 'Leave Group'}
                onPress={() => {
                  setActionError(null);
                  leaveMutation.mutate();
                }}
                disabled={isBusy}
              />
            ) : (
              <Button
                label={isBusy ? 'Joining...' : 'Join Campaign'}
                onPress={() => {
                  setActionError(null);
                  joinMutation.mutate();
                }}
                disabled={isBusy}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}