"use client";

import { useState, type ReactNode } from "react";
import { showcase as s, type ThemeName } from "@nfe/ui";
import {
  AdminTopBar,
  BottomNav,
  Button,
  Card,
  ChoiceChip,
  ClassCard,
  ClassRow,
  DataTable,
  DateStrip,
  DateTile,
  FreeTimeBlock,
  IconButton,
  InfoBanner,
  KeyValueRow,
  Logo,
  MenuTile,
  NextClassCard,
  Panel,
  Pill,
  RoomCard,
  SectionHeader,
  SegmentedControl,
  SelectButton,
  SettingsGroup,
  SettingsRow,
  StatCard,
  Stepper,
  TeacherHeader,
  TeachesYouCard,
  TextField,
  UnderlineTabs,
  WeekScheduleRow,
} from "@nfe/ui/web";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-body text-caption font-semibold uppercase tracking-[0.06em] text-text-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function UiGallery({ theme }: { theme: ThemeName }) {
  const [batch, setBatch] = useState("263");
  const [section, setSection] = useState("A");
  const [lab, setLab] = useState("A1");
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [day, setDay] = useState("11");
  const [tab, setTab] = useState<"exams" | "deadlines" | "notices">("exams");
  const [weekday, setWeekday] = useState("Sat");
  const [nav, setNav] = useState("home");
  const [query, setQuery] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});

  return (
    <div data-theme={theme} className="min-w-0 bg-bg p-5 text-text">
      <div className="mx-auto max-w-[480px] space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <span className="font-display text-title font-bold">{s.admin.appName}</span>
          </div>
          <Pill label={theme} tone="accent" />
        </div>

        <Block title="Logo">
          <div className="flex items-end gap-4">
            <Logo size={16} />
            <Logo size={32} />
            <Logo size={48} />
            <Logo size={96} label={s.admin.appName} />
          </div>
        </Block>

        <Block title="Type">
          <p className="font-display text-display font-bold">No classes today</p>
          <p className="font-display text-title font-bold">Choose your class</p>
          <p className="font-body text-heading font-semibold">Sunday, 8 November</p>
          <p className="font-body text-body">Body text · ক্লাস রুটিন · NFE বিভাগ</p>
          <p className="font-body text-small text-text-muted">0531-1103 · DNU · AB-1: 304</p>
          <p className="font-body text-caption font-semibold uppercase tracking-[0.06em] text-accent">
            Step 2 of 2
          </p>
        </Block>

        <Block title="Choice chips">
          <div className="flex flex-wrap gap-2">
            {s.batches.map((b) => (
              <ChoiceChip key={b} label={b} selected={b === batch} onClick={() => setBatch(b)} />
            ))}
          </div>
          <div className="flex gap-2">
            {s.sections.map((x) => (
              <ChoiceChip
                key={x}
                label={x}
                wide
                selected={x === section}
                onClick={() => setSection(x)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {s.labGroups.map((x) => (
              <ChoiceChip key={x} label={x} wide selected={x === lab} onClick={() => setLab(x)} />
            ))}
          </div>
        </Block>

        <Block title="Buttons">
          <Button label="Show my routine" />
          <div className="flex gap-3">
            <Button label="Call" icon="phone" size="medium" className="flex-1" />
            <Button
              label="Email"
              icon="mail"
              size="medium"
              variant="secondary"
              className="flex-1"
            />
          </div>
          <div className="flex gap-3">
            <IconButton icon="search" label="Search" />
            <IconButton icon="download" label="Download" />
            <IconButton icon="bell" label="Notifications" dot />
          </div>
        </Block>

        <Block title="Home">
          <NextClassCard {...s.nextClass} />
          <SectionHeader title="Sunday, 8 November" actionLabel="Full week" />
          <Card padding="md">
            <div className="divide-y divide-border">
              {s.classRows.map((r) => (
                <ClassRow key={r.time} {...r} />
              ))}
            </div>
          </Card>
          <InfoBanner {...s.version} variant="outlined" />
          <InfoBanner {...s.newStudent} tone="warning" />
        </Block>

        <Block title="Routine">
          <SegmentedControl options={s.views} value={view} onChange={setView} label="View" />
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
          <div>
            {s.week.map((w) => (
              <WeekScheduleRow key={w.day} {...w} />
            ))}
          </div>
        </Block>

        <Block title="Academics">
          <UnderlineTabs tabs={s.tabs} value={tab} onChange={setTab} />
          <Card>
            <div className="flex gap-4">
              <DateTile month={s.exam.month} day={s.exam.day} />
              <div className="min-w-0 space-y-1">
                <p className="font-body text-body font-semibold">{s.exam.title}</p>
                <p className="font-body text-small text-text-muted">{s.exam.meta}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {s.exam.pills.map((p) => (
                    <Pill key={p.label} {...p} />
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <div className="flex flex-wrap gap-2">
            {s.pills.map((p) => (
              <Pill key={p.label} {...p} />
            ))}
          </div>
        </Block>

        <Block title="Empty rooms">
          <TextField
            value={query}
            onChange={setQuery}
            placeholder={s.search}
            label="Search rooms"
            icon="search"
            shape="pill"
          />
          <div className="flex gap-2 overflow-x-auto">
            {s.weekdays.map((d) => (
              <ChoiceChip
                key={d}
                label={d}
                shape="pill"
                selected={d === weekday}
                onClick={() => setWeekday(d)}
              />
            ))}
          </div>
          <SelectButton value={s.slot} label="Time slot" />
          <div className="flex items-center justify-between">
            <h3 className="font-body text-heading font-semibold">{s.available.title}</h3>
            <Pill label={s.available.count} tone="accent" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {s.rooms.map((r) => (
              <RoomCard key={r.number} {...r} />
            ))}
          </div>
        </Block>

        <Block title="Menu">
          <div className="grid grid-cols-2 gap-3">
            {s.menuTiles.map((m) => (
              <MenuTile key={m.label} {...m} />
            ))}
          </div>
          <SettingsGroup title={s.settings.title}>
            {s.settings.rows.map((r) => (
              <SettingsRow key={r.title} {...r} />
            ))}
          </SettingsGroup>
        </Block>

        <Block title="Bottom nav">
          <div className="overflow-hidden rounded-card">
            <BottomNav items={s.nav} value={nav} onChange={setNav} label="Main" />
          </div>
        </Block>
      </div>

      <div className="mt-10 space-y-6">
        <Block title="Admin">
          <div className="overflow-hidden rounded-card border border-border">
            <AdminTopBar
              appName={s.admin.appName}
              areaLabel={s.admin.area}
              user={s.admin.user}
              links={s.admin.links.map((l, i) => ({ href: `#${l}`, label: l, active: i === 0 }))}
            />
          </div>
          <Stepper steps={s.admin.steps} current={2} />
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            {s.admin.stats.map((st) => (
              <StatCard key={st.label} {...st} />
            ))}
          </div>
          <Panel
            title="Faculty initials without details"
            description="Saved once and reused every semester."
            aside={<Pill label="80 to complete" tone="warning" size="sm" />}
          >
            <DataTable
              rows={s.admin.faculty}
              rowKey={(r) => r.initial}
              columns={[
                { key: "initial", header: "Initial", render: (r) => <b>{r.initial}</b> },
                { key: "classes", header: "Classes / week", render: (r) => r.classes },
                {
                  key: "name",
                  header: "Full name",
                  render: (r) => (
                    <TextField
                      label={`Full name of ${r.initial}`}
                      placeholder="Full name"
                      value={names[r.initial] ?? ""}
                      onChange={(v) => setNames((n) => ({ ...n, [r.initial]: v }))}
                    />
                  ),
                },
              ]}
            />
          </Panel>
          <Panel title="Checks">
            {s.admin.checks.map((c) => (
              <KeyValueRow key={c.label} {...c} />
            ))}
          </Panel>
        </Block>
      </div>
    </div>
  );
}
