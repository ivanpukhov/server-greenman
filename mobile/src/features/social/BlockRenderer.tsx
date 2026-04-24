import React, { useRef, useState } from 'react';
import { View, Linking, Pressable, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { reading, ui } from '@/theme/typography';
import { semantic, greenman } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

type Block = { type: string; data: any };
type Doc = { blocks?: Block[] } | Block[] | string | null | undefined;

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PADDING = spacing.lg;
const READING_WIDTH = SCREEN_WIDTH - H_PADDING * 2;

function parse(doc: Doc): Block[] {
  if (!doc) return [];
  if (typeof doc === 'string') {
    try { return parse(JSON.parse(doc)); } catch { return []; }
  }
  if (Array.isArray(doc)) return doc as Block[];
  if ((doc as any).blocks) return (doc as any).blocks as Block[];
  return [];
}

function stripHtml(s: string): string {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type RendererOptions = {
  /** Отступ между блоками (по умолчанию 18) */
  blockGap?: number;
  /** Первый абзац рендерим крупнее (Medium-style lead) */
  leadParagraph?: boolean;
};

export default function BlockRenderer({
  blocks,
  options,
}: {
  blocks: Doc;
  options?: RendererOptions;
}) {
  const parsed = parse(blocks);
  const gap = options?.blockGap ?? 18;
  let firstParagraphSeen = false;

  return (
    <View>
      {parsed.map((b, i) => {
        const isLead = options?.leadParagraph && b?.type === 'paragraph' && !firstParagraphSeen;
        if (b?.type === 'paragraph') firstParagraphSeen = true;
        return (
          <View key={i} style={{ marginBottom: gap }}>
            <BlockView block={b} isLead={!!isLead} />
          </View>
        );
      })}
    </View>
  );
}

function BlockView({ block, isLead }: { block: Block; isLead: boolean }) {
  const { type, data } = block || {};
  if (!type) return null;

  switch (type) {
    case 'header': {
      const level = Math.min(Math.max(parseInt(data?.level || 2, 10), 1), 3);
      const style =
        level === 1 ? reading.h1 : level === 2 ? reading.h2 : reading.h3;
      const topMargin = level === 1 ? 16 : level === 2 ? 12 : 8;
      return (
        <View style={{ paddingHorizontal: H_PADDING, marginTop: topMargin }}>
          <Text style={style}>{stripHtml(data?.text || '')}</Text>
        </View>
      );
    }

    case 'paragraph': {
      const text = stripHtml(data?.text || '');
      if (!text) return null;
      return (
        <View style={{ paddingHorizontal: H_PADDING }}>
          <Text style={isLead ? reading.bodyLarge : reading.body}>{text}</Text>
        </View>
      );
    }

    case 'quote':
      return (
        <View style={{ paddingHorizontal: H_PADDING }}>
          <View
            style={{
              borderLeftWidth: 3,
              borderLeftColor: greenman[7],
              paddingLeft: spacing.md,
              paddingVertical: spacing.xs,
            }}
          >
            <Text style={reading.quote}>{stripHtml(data?.text || '')}</Text>
            {data?.caption ? (
              <Text style={[reading.caption, { marginTop: spacing.xs }]}>
                — {stripHtml(data.caption)}
              </Text>
            ) : null}
          </View>
        </View>
      );

    case 'list': {
      const items = Array.isArray(data?.items) ? data.items : [];
      const ordered = data?.style === 'ordered';
      return (
        <View style={{ paddingHorizontal: H_PADDING }}>
          {items.map((it: any, i: number) => {
            const content = stripHtml(typeof it === 'string' ? it : it?.content || '');
            if (!content) return null;
            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  marginBottom: 6,
                  paddingLeft: spacing.xs,
                }}
              >
                <Text
                  style={[
                    reading.body,
                    { width: ordered ? 28 : 16, color: semantic.inkDim },
                  ]}
                >
                  {ordered ? `${i + 1}.` : '•'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={reading.body}>{content}</Text>
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    case 'delimiter':
      return (
        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <Text
            style={{
              fontFamily: 'Manrope_500Medium',
              color: semantic.inkMuted,
              fontSize: 20,
              letterSpacing: 8,
            }}
          >
            * * *
          </Text>
        </View>
      );

    case 'image': {
      const url = data?.file?.url || data?.url;
      const blurhash = data?.file?.blurhash || data?.blurhash;
      const caption = data?.caption ? stripHtml(data.caption) : '';
      if (!url) return null;
      const w = data?.file?.width || data?.width;
      const h = data?.file?.height || data?.height;
      const aspect = w && h ? w / h : 16 / 9;
      const height = Math.min(520, Math.round(SCREEN_WIDTH / aspect));
      return (
        <View>
          <View style={{ width: SCREEN_WIDTH, height, backgroundColor: semantic.surfaceSunken }}>
            <Image
              source={{ uri: url }}
              placeholder={blurhash ? { blurhash } : undefined}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={200}
            />
          </View>
          {caption ? (
            <Text
              style={[
                reading.caption,
                { paddingHorizontal: H_PADDING, marginTop: spacing.xs, fontStyle: 'italic' },
              ]}
            >
              {caption}
            </Text>
          ) : null}
        </View>
      );
    }

    case 'gallery': {
      const items: any[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.images)
        ? data.images
        : [];
      if (!items.length) return null;
      return <Gallery items={items} />;
    }

    case 'video': {
      const url = data?.file?.url || data?.url;
      if (!url) return null;
      return <InlineVideo url={url} caption={data?.caption} poster={data?.file?.thumbnailUrl || data?.thumbnailUrl} />;
    }

    case 'embed': {
      const source = data?.source || data?.url;
      const caption = data?.caption ? stripHtml(data.caption) : '';
      if (!source) return null;
      return (
        <View style={{ paddingHorizontal: H_PADDING }}>
          <Pressable
            onPress={() => Linking.openURL(source)}
            accessibilityRole="link"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              backgroundColor: semantic.surfaceSunken,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: semantic.border,
            }}
          >
            <Ionicons name="link-outline" size={20} color={semantic.accent} />
            <View style={{ flex: 1 }}>
              <Text style={ui.label} numberOfLines={2}>
                {caption || source}
              </Text>
              <Text style={[ui.meta, { marginTop: 2 }]} numberOfLines={1}>
                {source}
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={semantic.inkDim} />
          </Pressable>
        </View>
      );
    }

    case 'attaches': {
      const url = data?.file?.url;
      const name = data?.title || data?.file?.name || 'Файл';
      const size = data?.file?.size;
      if (!url) return null;
      return (
        <View style={{ paddingHorizontal: H_PADDING }}>
          <Pressable
            onPress={() => Linking.openURL(url)}
            accessibilityRole="link"
            accessibilityLabel={`Скачать ${name}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              backgroundColor: semantic.surfaceSunken,
              borderRadius: radii.md,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.sm,
                backgroundColor: semantic.accentMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="document-outline" size={20} color={semantic.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ui.label} numberOfLines={1}>
                {name}
              </Text>
              {typeof size === 'number' ? (
                <Text style={ui.meta}>{formatBytes(size)}</Text>
              ) : null}
            </View>
            <Ionicons name="download-outline" size={20} color={semantic.inkDim} />
          </Pressable>
        </View>
      );
    }

    case 'code':
      return (
        <View style={{ paddingHorizontal: H_PADDING }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View
              style={{
                backgroundColor: '#0f172a',
                padding: spacing.md,
                borderRadius: radii.md,
                minWidth: READING_WIDTH,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Courier',
                  fontSize: 13,
                  lineHeight: 20,
                  color: '#e2e8f0',
                }}
              >
                {String(data?.code || '')}
              </Text>
            </View>
          </ScrollView>
        </View>
      );

    case 'warning':
    case 'callout': {
      const variant: 'warning' | 'info' | 'success' =
        type === 'warning' ? 'warning' : (data?.variant ?? 'info');
      const palette =
        variant === 'warning'
          ? { bg: '#fef3c7', fg: '#92400e', border: '#fcd34d', icon: 'alert-circle' as const }
          : variant === 'success'
          ? { bg: '#dcfce7', fg: '#166534', border: '#86efac', icon: 'checkmark-circle' as const }
          : { bg: greenman[0], fg: greenman[8], border: greenman[2], icon: 'information-circle' as const };
      return (
        <View style={{ paddingHorizontal: H_PADDING }}>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radii.md,
              backgroundColor: palette.bg,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Ionicons name={palette.icon} size={20} color={palette.fg} />
            <View style={{ flex: 1 }}>
              {data?.title ? (
                <Text style={[ui.label, { color: palette.fg, marginBottom: 2 }]}>
                  {stripHtml(data.title)}
                </Text>
              ) : null}
              {data?.message || data?.text ? (
                <Text style={[ui.body, { color: palette.fg }]}>
                  {stripHtml(data?.message || data?.text)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      );
    }

    default:
      return null;
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function Gallery({ items }: { items: any[] }) {
  const [active, setActive] = useState(0);
  const urls = items
    .map((it) => (typeof it === 'string' ? it : it?.url || it?.file?.url))
    .filter((u): u is string => typeof u === 'string' && !!u);
  if (!urls.length) return null;
  const height = Math.min(520, Math.round((SCREEN_WIDTH * 4) / 5));
  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActive(idx);
        }}
      >
        {urls.map((url, i) => (
          <View key={i} style={{ width: SCREEN_WIDTH, height }}>
            <Image source={{ uri: url }} style={{ flex: 1 }} contentFit="cover" transition={200} />
          </View>
        ))}
      </ScrollView>
      {urls.length > 1 ? (
        <View
          style={{
            position: 'absolute',
            bottom: spacing.sm,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {urls.map((_, i) => (
            <View
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === active ? '#fff' : 'rgba(255,255,255,0.55)',
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function InlineVideo({
  url,
  poster,
  caption,
}: {
  url: string;
  poster?: string | null;
  caption?: string;
}) {
  const ref = useRef<Video>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const height = Math.round((SCREEN_WIDTH * 9) / 16);

  return (
    <View>
      <View style={{ width: SCREEN_WIDTH, height, backgroundColor: '#000' }}>
        <Video
          ref={ref}
          source={{ uri: url }}
          style={{ flex: 1 }}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={playing}
          posterSource={poster ? { uri: poster } : undefined}
          posterStyle={{ resizeMode: 'cover' }}
          usePoster={!playing && !!poster}
          onLoad={() => setReady(true)}
          onPlaybackStatusUpdate={(s) => {
            if ('isLoaded' in s && s.isLoaded) {
              setPlaying(!!s.isPlaying);
            }
          }}
        />
        {!playing ? (
          <Pressable
            onPress={async () => {
              setPlaying(true);
              await ref.current?.playAsync().catch(() => {});
            }}
            accessibilityRole="button"
            accessibilityLabel="Воспроизвести видео"
            style={{
              position: 'absolute',
              inset: 0 as any,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="play" size={30} color="#fff" />
            </View>
          </Pressable>
        ) : null}
      </View>
      {caption ? (
        <Text
          style={[
            reading.caption,
            { paddingHorizontal: H_PADDING, marginTop: spacing.xs, fontStyle: 'italic' },
          ]}
        >
          {stripHtml(caption)}
        </Text>
      ) : null}
    </View>
  );
}
