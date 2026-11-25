import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  getMyMemberships,
  listSocietyMembers,
  updateMembershipStatus,
} from '../../api/societies';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { useAuthStore } from '../../store/authStore';

export default function SocietyAdminResidentsScreen() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();
  const [chosenSocietyId, setChosenSocietyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const membershipsQuery = useQuery({
    queryKey: ['my-memberships', userId],
    queryFn: () => getMyMemberships(userId!),
    enabled: Boolean(userId),
  });

  const adminSocieties = (membershipsQuery.data ?? []).filter(
    (m) => m.status === 'approved' && m.is_admin
  );

  const activeSocietyId = chosenSocietyId ?? adminSocieties[0]?.society_id ?? null;

  const membersQuery = useQuery({
    queryKey: ['society-members', activeSocietyId],
    queryFn: () => listSocietyMembers(activeSocietyId!),
    enabled: Boolean(activeSocietyId),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      membershipId,
      status,
    }: {
      membershipId: string;
      status: 'approved' | 'rejected';
    }) => updateMembershipStatus(membershipId, status),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['society-members', activeSocietyId] });
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const members = membersQuery.data ?? [];

  return (
    <Screen>
      <Text className="mt-6 text-3xl font-bold text-ink">Residents</Text>
      <Text className="mt-1 text-muted">Approve or reject resident join requests.</Text>

      {adminSocieties.length > 1 && (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {adminSocieties.map((m) => {
            const isSelected = m.society_id === activeSocietyId;
            return (
              <Pressable
                key={m.id}
                onPress={() => setChosenSocietyId(m.society_id)}
                className={`rounded-full px-4 py-2 ${
                  isSelected ? 'bg-primary' : 'bg-tint'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? 'text-white' : 'text-primary-dark'
                  }`}
                >
                  {m.societies?.name ?? m.society_id}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {actionError && <Text className="mt-3 text-sm text-rust">{actionError}</Text>}

      {!activeSocietyId ? (
        <Card className="mt-4">
          <Text className="text-muted">No admin society membership found.</Text>
        </Card>
      ) : membersQuery.isLoading ? (
        <ActivityIndicator className="mt-6" />
      ) : members.length === 0 ? (
        <Card className="mt-4">
          <Text className="text-muted">No resident requests in this society yet.</Text>
        </Card>
      ) : (
        members.map((member) => {
          const tone = member.status === 'approved' ? 'gold' : 'rust';
          return (
            <Card key={member.id} className="mt-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-ink">
                    {member.profiles?.full_name || 'Unnamed Resident'}
                  </Text>
                  <Text className="text-sm text-muted">
                    Wing {member.wing} · Flat {member.flat_number}
                  </Text>
                  {member.profiles?.phone && (
                    <Text className="text-xs text-muted">{member.profiles.phone}</Text>
                  )}
                </View>
                <Badge
                  label={member.is_admin ? `${member.status} · admin` : member.status}
                  tone={tone}
                />
              </View>

              {member.status === 'pending' && (
                <View className="mt-4 flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      label="Approve"
                      onPress={() =>
                        statusMutation.mutate({ membershipId: member.id, status: 'approved' })
                      }
                      disabled={statusMutation.isPending}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Reject"
                      onPress={() =>
                        statusMutation.mutate({ membershipId: member.id, status: 'rejected' })
                      }
                      disabled={statusMutation.isPending}
                    />
                  </View>
                </View>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}