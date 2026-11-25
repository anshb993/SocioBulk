import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

let channelSeq = 0;

export function useCampaignRealtime(campaignId?: string, societyId?: string) {
  const queryClient = useQueryClient();
  const instanceIdRef = useRef<number>(++channelSeq);

  useEffect(() => {
    if (!campaignId && !societyId) return;

    const filter = campaignId
      ? `id=eq.${campaignId}`
      : `society_id=eq.${societyId}`;

    const topic = `campaigns-rt-${campaignId ?? societyId}-${instanceIdRef.current}`;

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter,
        },
        () => {
          if (campaignId) {
            queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
          }
          if (societyId) {
            queryClient.invalidateQueries({ queryKey: ['society-campaigns', societyId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, societyId, queryClient]);
}