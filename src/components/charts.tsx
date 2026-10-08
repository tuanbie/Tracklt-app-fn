/** Lightweight SVG charts — avoids pulling a charting library for two chart types. */
import { View } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

import { monthLabel } from '@/domain/dates';
import type { MonthPoint } from '@/domain/finance';
import { useTheme } from '@/theme/ThemeProvider';
import { Row, Text } from './ui';

export function DonutChart({
  slices,
  size = 168,
  stroke = 22,
  centerLabel,
  centerValue,
}: {
  slices: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  centerLabel: string;
  centerValue: string;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const GAP = slices.length > 1 ? 2 : 0;
  let offset = 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Rotate a wrapping View so arcs start at 12 o'clock — SVG transform props break on web. */}
      <View style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceRaised} strokeWidth={stroke} fill="none" />
          {total > 0 &&
            slices.map((s, i) => {
              const len = (s.value / total) * c;
              const dash = Math.max(0, len - GAP);
              const el = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={s.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </Svg>
      </View>
      <Text variant="caption" tone="secondary">
        {centerLabel}
      </Text>
      <Text variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: size - stroke * 2 - 8 }}>
        {centerValue}
      </Text>
    </View>
  );
}

/** Grouped income/expense bars per month. */
export function IncomeExpenseBars({ points, height = 160 }: { points: MonthPoint[]; height?: number }) {
  const { colors, spacing } = useTheme();
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]));
  const BAR = 10;
  const groupW = 36;
  const width = points.length * groupW;

  return (
    <View>
      <View accessible accessibilityLabel="Biểu đồ thu chi theo tháng" style={{ alignItems: 'center' }}>
        <Svg width={width} height={height}>
          {points.map((p, i) => {
            const x = i * groupW + (groupW - BAR * 2 - 4) / 2;
            const hi = Math.max(2, (p.income / max) * (height - 4));
            const he = Math.max(2, (p.expense / max) * (height - 4));
            return (
              <G key={p.key}>
                <Rect x={x} y={height - hi} width={BAR} height={hi} rx={4} fill={colors.success} />
                <Rect x={x + BAR + 4} y={height - he} width={BAR} height={he} rx={4} fill={colors.danger} />
              </G>
            );
          })}
        </Svg>
        <Row style={{ width }}>
          {points.map((p) => (
            <Text key={p.key} variant="caption" tone="secondary" align="center" style={{ width: groupW }}>
              {monthLabel(p.key, true)}
            </Text>
          ))}
        </Row>
      </View>
      <Row gap={spacing.lg} justify="center" style={{ marginTop: spacing.sm }}>
        <Legend color={colors.success} label="Thu" />
        <Legend color={colors.danger} label="Chi" />
      </Row>
    </View>
  );
}

export function Legend({ color, label }: { color: string; label: string }) {
  const { spacing } = useTheme();
  return (
    <Row gap={spacing.xs}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        }}
      />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </Row>
  );
}
