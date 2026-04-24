import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
} from 'react';
import { View, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { semantic, greenman } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { ui } from '@/theme/typography';
import { formatRelativeRu } from '@/lib/format/relativeTime';
import { useAuthStore } from '@/stores/auth.store';

export type CommentableType = 'post' | 'article' | 'reel' | 'webinar' | 'course_day';

type Author = { id: string; name: string; kind: 'user' | 'admin' | 'anon' };

type CommentItem = {
  id: number;
  commentableType: CommentableType;
  commentableId: number;
  userId: number | null;
  adminUserId: number | null;
  body: string;
  parentCommentId: number | null;
  createdAt: string;
  editedAt?: string | null;
  author?: Author;
};

type TreeNode = CommentItem & { children: CommentItem[] };

export type CommentsSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  type: CommentableType;
  id: number | null;
  onCountChange?: (count: number) => void;
};

const commentKeys = {
  list: (t: CommentableType, id: number) => ['social', 'comments', t, id] as const,
};

function fallbackAuthor(c: Pick<CommentItem, 'userId' | 'adminUserId'>): Author {
  if (c.adminUserId) return { id: `admin-${c.adminUserId}`, name: 'Greenman', kind: 'admin' };
  if (c.userId) return { id: `user-${c.userId}`, name: 'Пользователь', kind: 'user' };
  return { id: 'anon', name: 'Гость', kind: 'anon' };
}

function normalizeComment(c: CommentItem): CommentItem & { author: Author } {
  return {
    ...c,
    author: c.author ?? fallbackAuthor(c),
  };
}

function buildTree(flat: CommentItem[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const byId = new Map<number, TreeNode>();
  for (const c of flat) byId.set(c.id, { ...normalizeComment(c), children: [] });
  for (const node of byId.values()) {
    if (node.parentCommentId && byId.has(node.parentCommentId)) {
      byId.get(node.parentCommentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export const CommentsSheet = forwardRef<CommentsSheetRef, Props>(function CommentsSheet(
  { type, id, onCountChange },
  ref
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }),
    []
  );

  const snapPoints = useMemo(() => ['70%', '92%'], []);

  const renderBackdrop = useCallback(
    // @ts-expect-error — gorhom props typing
    (p) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />,
    []
  );

  const q = useQuery<CommentItem[], Error>({
    queryKey: id ? commentKeys.list(type, id) : ['social', 'comments', 'noop'],
    queryFn: async () => {
      if (!id) return [];
      const data = (await socialApi.comments.list(type, id)) as CommentItem[];
      const normalized = data.map(normalizeComment);
      onCountChange?.(normalized.length);
      return normalized;
    },
    enabled: !!id,
    staleTime: 15_000,
  });

  const tree = useMemo(() => (q.data ? buildTree(q.data) : []), [q.data]);

  const createM = useMutation<
    CommentItem,
    Error,
    { body: string; parentCommentId?: number }
  >({
    mutationFn: ({ body, parentCommentId }) =>
      socialApi.comments.create({ type, id: id!, body, parentCommentId }),
    onSuccess: (created) => {
      if (!id) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.setQueryData<CommentItem[]>(commentKeys.list(type, id), (prev) => {
        const next = [...(prev ?? []).map(normalizeComment), normalizeComment(created)];
        onCountChange?.(next.length);
        return next;
      });
      setInput('');
      setReplyTo(null);
      Keyboard.dismiss();
    },
  });

  const removeM = useMutation<{ ok: true }, Error, number>({
    mutationFn: (commentId) => socialApi.comments.remove(commentId),
    onSuccess: (_res, commentId) => {
      if (!id) return;
      qc.setQueryData<CommentItem[]>(commentKeys.list(type, id), (prev) => {
        const next = (prev ?? []).filter((c) => c.id !== commentId);
        onCountChange?.(next.length);
        return next;
      });
    },
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text || !id) return;
    if (!isAuthed) {
      sheetRef.current?.dismiss();
      router.push('/auth/phone');
      return;
    }
    createM.mutate({ body: text, parentCommentId: replyTo?.id });
  };

  const inputBlock = (
    <BottomSheetView>
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.xs,
          paddingBottom: spacing.md,
          backgroundColor: semantic.surface,
          borderTopWidth: 1,
          borderTopColor: semantic.border,
        }}
      >
          {replyTo ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
                marginBottom: spacing.xs,
                backgroundColor: semantic.surfaceMuted,
                borderRadius: radii.sm,
              }}
            >
              <Ionicons name="return-down-forward" size={14} color={semantic.accent} />
              <Text style={[ui.meta, { flex: 1 }]} numberOfLines={1}>
                Ответ {normalizeComment(replyTo).author.name}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Ionicons name="close" size={16} color={semantic.inkDim} />
              </Pressable>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: spacing.xs,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: semantic.surfaceSunken,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: semantic.border,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
              }}
            >
              <BottomSheetTextInput
                value={input}
                onChangeText={setInput}
                placeholder={isAuthed ? 'Комментарий…' : 'Войдите, чтобы комментировать'}
                placeholderTextColor={semantic.inkMuted}
                multiline
                editable={isAuthed}
                style={{
                  fontFamily: 'Manrope_400Regular',
                  fontSize: 15,
                  lineHeight: 22,
                  color: semantic.ink,
                  maxHeight: 120,
                  minHeight: 22,
                  padding: 0,
                }}
              />
            </View>
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || createM.isPending}
              accessibilityRole="button"
              accessibilityLabel="Отправить"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: input.trim() ? greenman[7] : semantic.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {createM.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={input.trim() ? '#fff' : semantic.inkMuted}
                />
              )}
            </Pressable>
          </View>
      </View>
    </BottomSheetView>
  );

  const renderItem = useCallback(
    ({ item }: { item: TreeNode }) => (
      <CommentRow
        node={item}
        onReply={(c) => setReplyTo(c)}
        onDelete={(c) => removeM.mutate(c.id)}
      />
    ),
    [removeM]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={{ backgroundColor: '#cfd8cf', width: 40 }}
      backgroundStyle={{
        backgroundColor: semantic.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
    >
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: semantic.border,
        }}
      >
        <Text style={ui.h3}>Комментарии</Text>
        <Text style={[ui.meta, { marginTop: 2 }]}>
          {q.data?.length ?? 0} {pluralize(q.data?.length ?? 0)}
        </Text>
      </View>

      <BottomSheetFlatList
        data={tree}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: spacing.sm, paddingBottom: spacing.lg }}
        ListEmptyComponent={
          q.isLoading ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator color={semantic.accent} />
            </View>
          ) : (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={semantic.inkMuted} />
              <Text style={[ui.body, { marginTop: spacing.xs, color: semantic.inkDim }]}>
                Пока нет комментариев
              </Text>
              <Text style={[ui.meta, { marginTop: 2 }]}>Будьте первым</Text>
            </View>
          )
        }
      />
      {inputBlock}
    </BottomSheetModal>
  );
});

function CommentRow({
  node,
  onReply,
  onDelete,
  depth = 0,
}: {
  node: TreeNode;
  onReply: (c: CommentItem) => void;
  onDelete: (c: CommentItem) => void;
  depth?: number;
}) {
  const myUserId = useAuthStore((s) => s.userId);
  const canDelete = node.userId != null && node.userId === myUserId;
  const author = node.author ?? fallbackAuthor(node);
  const isAdmin = author.kind === 'admin';

  return (
    <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingLeft: depth * 28 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isAdmin ? greenman[1] : semantic.surfaceSunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isAdmin ? 'leaf' : 'person'}
            size={16}
            color={isAdmin ? greenman[7] : semantic.inkDim}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={ui.label} numberOfLines={1}>
              {author.name}
            </Text>
            {isAdmin ? (
              <View
                style={{
                  backgroundColor: greenman[1],
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: radii.sm,
                }}
              >
                <Text style={[ui.meta, { color: greenman[8], fontSize: 10 }]}>Автор</Text>
              </View>
            ) : null}
            <Text style={ui.meta}>{formatRelativeRu(node.createdAt)}</Text>
          </View>
          <Text style={[ui.body, { marginTop: 2 }]}>{node.body}</Text>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              marginTop: 4,
              alignItems: 'center',
            }}
          >
            <Pressable onPress={() => onReply(node)} hitSlop={6}>
              <Text style={[ui.meta, { color: semantic.accent, fontWeight: '600' }]}>
                Ответить
              </Text>
            </Pressable>
            {canDelete ? (
              <Pressable onPress={() => onDelete(node)} hitSlop={6}>
                <Text style={[ui.meta, { color: semantic.danger }]}>Удалить</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {node.children.length > 0 ? (
        <View style={{ marginTop: spacing.xs }}>
          {node.children.map((child) => (
            <CommentRow
              key={child.id}
              node={{ ...child, children: [] }}
              onReply={onReply}
              onDelete={onDelete}
              depth={Math.min(depth + 1, 2)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function pluralize(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'комментарий';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'комментария';
  return 'комментариев';
}
