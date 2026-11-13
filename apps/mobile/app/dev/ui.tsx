import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_LOCALE } from "@nfe/core";
import { showcase as s, type ThemePreference } from "@nfe/ui";
import {
  BottomNav,
  Button,
  Card,
  ChoiceChip,
  ClassCard,
  ClassRow,
  DateStrip,
  DateTile,
  FreeTimeBlock,
  IconButton,
  InfoBanner,
  Logo,
  MenuTile,
  NextClassCard,
  Pill,
  RoomCard,
  SectionHeader,
  SegmentedControl,
  SelectButton,
  SettingsGroup,
  SettingsRow,
  TeacherHeader,
  TeachesYouCard,
  Text,
  TextField,
  UiProvider,
  UnderlineTabs,
  useTheme,
  WeekScheduleRow,
} from "@nfe/ui/native";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text variant="caption" color="textFaint">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ children, wrap }: { children: ReactNode; wrap?: boolean }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: wrap ? "wrap" : "nowrap", gap: 8 }}>
      {children}
    </View>
  );
}

function Gallery({
  preference,
  onPreference,
}: {
  preference: ThemePreference;
  onPreference: (p: ThemePreference) => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [batch, setBatch] = useState("263");
  const [section, setSection] = useState("A");
  const [lab, setLab] = useState("A1");
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [day, setDay] = useState("11");
  const [tab, setTab] = useState<"exams" | "deadlines" | "notices">("exams");
  const [weekday, setWeekday] = useState("Sat");
  const [nav, setNav] = useState("home");
  const [query, setQuery] = useState("");

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: t.layout.screenPadding,
          paddingTop: insets.top + 12,
          gap: 32,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Logo size={40} />
          <Text variant="title">{s.admin.appName}</Text>
        </View>
        <SegmentedControl
          options={[
            { value: "system", label: "System" },
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
          value={preference}
          onChange={onPreference}
        />

        <Block title="Logo">
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
            <Logo size={16} />
            <Logo size={32} />
            <Logo size={48} />
            <Logo size={96} label={s.admin.appName} />
          </View>
        </Block>

        <Block title="Type">
          <Text variant="display">No classes today</Text>
          <Text variant="title">Choose your class</Text>
          <Text variant="heading">Sunday, 8 November</Text>
          <Text>Body text</Text>
          <Text variant="small" color="textMuted">
            0531-1103 · DNU · AB-1: 304
          </Text>
          <Text variant="caption" color="accent">
            Step 2 of 2
          </Text>
          <UiProvider preference={preference} locale="bn">
            <Text variant="heading">ক্লাস রুটিন · NFE বিভাগ, DIU</Text>
          </UiProvider>
        </Block>

        <Block title="Choice chips">
          <Row wrap>
            {s.batches.map((b) => (
              <ChoiceChip key={b} label={b} selected={b === batch} onPress={() => setBatch(b)} />
            ))}
          </Row>
          <Row>
            {s.sections.map((x) => (
              <ChoiceChip
                key={x}
                label={x}
                wide
                selected={x === section}
                onPress={() => setSection(x)}
              />
            ))}
          </Row>
          <Row>
            {s.labGroups.map((x) => (
              <ChoiceChip key={x} label={x} wide selected={x === lab} onPress={() => setLab(x)} />
            ))}
          </Row>
        </Block>

        <Block title="Buttons">
          <Button label="Show my routine" />
          <Row>
            <Button label="Call" icon="phone" size="medium" flex />
            <Button label="Email" icon="mail" size="medium" variant="secondary" flex />
          </Row>
          <Row>
            <IconButton icon="search" label="Search" />
            <IconButton icon="download" label="Download" />
            <IconButton icon="bell" label="Notifications" dot />
          </Row>
        </Block>

        <Block title="Home">
          <NextClassCard {...s.nextClass} />
          <SectionHeader title="Sunday, 8 November" actionLabel="Full week" />
          <Card padding="md">
            {s.classRows.map((r) => (
              <ClassRow key={r.time} {...r} />
            ))}
          </Card>
          <InfoBanner {...s.version} variant="outlined" />
          <InfoBanner {...s.newStudent} tone="warning" />
        </Block>

        <Block title="Routine">
          <SegmentedControl options={s.views} value={view} onChange={setView} />
          <DateStrip days={s.days} selected={day} onSelect={setDay} />
          <ClassCard {...s.classCards[0]!} teacherLabel="Teacher DAMR" roomLabel="Room AB-1: 206" />
          <FreeTimeBlock {...s.freeTime} />
          <ClassCard {...s.classCards[1]!} status="Room changed → AB-1: 502" />
          <ClassCard {...s.classCards[1]!} colorIndex={3} cancelled status="Cancelled" />
        </Block>

        <Block title="Teacher">
          <TeacherHeader {...s.teacher} />
          <TeachesYouCard {...s.teachesYou} />
          <SectionHeader title="This week" meta="12 classes" />
          <View>
            {s.week.map((w, i) => (
              <WeekScheduleRow key={w.day} {...w} last={i === s.week.length - 1} />
            ))}
          </View>
        </Block>

        <Block title="Academics">
          <UnderlineTabs tabs={s.tabs} value={tab} onChange={setTab} />
          <Card>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <DateTile month={s.exam.month} day={s.exam.day} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="bodyStrong">{s.exam.title}</Text>
                <Text variant="small" color="textMuted">
                  {s.exam.meta}
                </Text>
                <Row wrap>
                  {s.exam.pills.map((p) => (
                    <Pill key={p.label} {...p} />
                  ))}
                </Row>
              </View>
            </View>
          </Card>
          <Row wrap>
            {s.pills.map((p) => (
              <Pill key={p.label} {...p} />
            ))}
          </Row>
        </Block>

        <Block title="Empty rooms">
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder={s.search}
            label="Search rooms"
            icon="search"
            shape="pill"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {s.weekdays.map((d) => (
              <ChoiceChip
                key={d}
                label={d}
                shape="pill"
                selected={d === weekday}
                onPress={() => setWeekday(d)}
              />
            ))}
          </ScrollView>
          <SelectButton value={s.slot} label="Time slot" />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <Text variant="heading">{s.available.title}</Text>
            <Pill label={s.available.count} tone="accent" size="sm" />
          </View>
          <Row>
            <RoomCard {...s.rooms[0]!} />
            <RoomCard {...s.rooms[1]!} />
          </Row>
          <Row>
            <RoomCard {...s.rooms[2]!} />
            <RoomCard {...s.rooms[3]!} />
          </Row>
        </Block>

        <Block title="Menu">
          <Row>
            <MenuTile {...s.menuTiles[0]!} />
            <MenuTile {...s.menuTiles[1]!} />
          </Row>
          <Row>
            <MenuTile {...s.menuTiles[2]!} />
            <MenuTile {...s.menuTiles[3]!} />
          </Row>
          <SettingsGroup title={s.settings.title}>
            {s.settings.rows.map((r, i) => (
              <SettingsRow key={r.title} {...r} last={i === s.settings.rows.length - 1} />
            ))}
          </SettingsGroup>
        </Block>
      </ScrollView>
      <BottomNav items={s.nav} value={nav} onChange={setNav} bottomInset={insets.bottom} />
    </View>
  );
}

/** Developer gallery of every component; switch Dark / Light at the top. */
export default function DevUiScreen() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <UiProvider preference={preference} locale={DEFAULT_LOCALE}>
      <Gallery preference={preference} onPreference={setPreference} />
    </UiProvider>
  );
}
