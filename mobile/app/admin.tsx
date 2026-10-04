import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/api";
import { useAuth } from "../src/auth";
import { mediaUrl } from "../src/config";
import { Avatar, Button, ErrorText, Field, Title } from "../src/components/ui";
import type { AdminContent, AdminReport, AdminSummary, AdminSupport, AdminUser } from "../src/types";
import { colors } from "../src/theme";

type Tab = "home" | "people" | "reports" | "content" | "support";
type PeopleFilter = "all" | "banned" | "reported";

const kindLabel: Record<AdminContent["kind"], string> = {
  profile: "Profile photo",
  photo: "Chat photo",
  file: "Chat file",
  message: "Reported message",
};

export default function AdminScreen() {
  const { user, token, booting, signOut } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const [query, setQuery] = useState("");
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all");
  const [contentUserId, setContentUserId] = useState("");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [items, setItems] = useState<AdminContent[]>([]);
  const [requests, setRequests] = useState<AdminSupport[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      if (tab === "home") {
        setSummary(await api.adminSummary(token));
      } else if (tab === "people") {
        const result = await api.adminUsers(token, query.trim(), peopleFilter);
        setUsers(result.users);
      } else if (tab === "reports") {
        const result = await api.adminReports(token);
        setReports(result.reports);
      } else if (tab === "support") {
        const result = await api.adminSupport(token);
        setRequests(result.requests);
      } else {
        const result = await api.adminContent(token, contentUserId);
        setItems(result.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin data");
    }
  }, [token, tab, query, peopleFilter, contentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  if (booting) return null;
  if (!user || !token) return <Redirect href="/login" />;
  if (user.role !== "admin") return <Redirect href="/discover" />;

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError("");
    try {
      await action();
      setBanTarget(null);
      setDeleteTarget(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That action failed");
    } finally {
      setBusyId("");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Title>{tab === "home" ? "Admin profile" : "Admin"}</Title>
            <Text style={styles.note}>{user.displayName} · {user.email}</Text>
          </View>
          {tab === "home" ? (
            <Pressable onPress={signOut} style={styles.signOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => { setContentUserId(""); setTab("home"); }} style={styles.signOut}>
              <Text style={styles.signOutText}>Back</Text>
            </Pressable>
          )}
        </View>

        {tab === "home" ? (
          <View>
            {(
              [
                ["people", "People", "Search, ban, unban, or delete an account", summary ? `${summary.people} accounts · ${summary.banned} banned` : ""],
                ["reports", "Reports", "Read a report, mark it reviewed, ban, or delete", summary ? `${summary.openReports} open` : ""],
                ["content", "Uploads", "Profile photos, chat photos, files, and reported messages", ""],
                ["support", "Support", "Messages people sent from the support form", summary ? `${summary.openSupport} open` : ""],
              ] as const
            ).map(([id, label, detail, count]) => (
              <Pressable key={id} style={styles.option} onPress={() => setTab(id)}>
                <Text style={styles.name}>{label}</Text>
                <Text style={styles.meta}>{detail}</Text>
                {count ? <Text style={styles.kind}>{count}</Text> : null}
              </Pressable>
            ))}
            <Pressable style={styles.option} onPress={() => router.push("/legal")}>
              <Text style={styles.name}>Privacy, terms, and copyright</Text>
              <Text style={styles.meta}>Open the legal pages</Text>
            </Pressable>
          </View>
        ) : null}

        {tab === "people" ? (
          <View>
            <Field label="Search name or email" value={query} onChangeText={setQuery} autoCapitalize="none" />
            <View style={styles.tabs}>
              {(
                [
                  ["all", "All"],
                  ["banned", "Banned"],
                  ["reported", "Reported"],
                ] as const
              ).map(([id, label]) => (
                <Pressable key={id} onPress={() => setPeopleFilter(id)} style={[styles.tab, peopleFilter === id && styles.tabOn]}>
                  <Text style={[styles.tabText, peopleFilter === id && styles.tabTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <ErrorText>{error}</ErrorText>

        {banTarget ? (
          <View style={styles.card}>
            <Text style={styles.name}>Ban {banTarget.displayName}</Text>
            <Field label="Reason" value={reason} onChangeText={setReason} placeholder="Explicit photo, harassment, spam" />
            <Button
              label="Confirm ban"
              tone="coral"
              disabled={busyId === banTarget.id}
              onPress={() => run(banTarget.id, () => api.banUser(token, banTarget.id, reason.trim()))}
            />
            <Button label="Cancel" tone="ghost" onPress={() => setBanTarget(null)} />
          </View>
        ) : null}

        {deleteTarget ? (
          <View style={styles.card}>
            <Text style={styles.name}>Delete {deleteTarget.displayName}?</Text>
            <Text style={styles.meta}>This removes the account, matches, messages, and uploaded files.</Text>
            <Button
              label="Delete account"
              tone="coral"
              disabled={busyId === deleteTarget.id}
              onPress={() => run(deleteTarget.id, () => api.deleteUser(token, deleteTarget.id))}
            />
            <Button label="Cancel" tone="ghost" onPress={() => setDeleteTarget(null)} />
          </View>
        ) : null}

        {tab === "people"
          ? users.map((person) => (
              <View key={person.id} style={styles.card}>
                <View style={styles.row}>
                  <Avatar name={person.displayName} photoUrl={person.photoUrl} />
                  <View style={styles.grow}>
                    <Text style={styles.name}>{person.displayName}</Text>
                    <Text style={styles.meta}>
                      {person.email} · {person.city || "No city"}
                      {person.role === "admin" ? " · Admin" : ""}
                      {person.banned ? " · Banned" : ""}
                      {person.reportCount ? ` · ${person.reportCount} reports` : ""}
                    </Text>
                    {person.bio ? <Text style={styles.reason}>{person.bio}</Text> : null}
                    {person.banReason ? <Text style={styles.reason}>{person.banReason}</Text> : null}
                  </View>
                </View>
                {person.role !== "admin" ? (
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.action}
                      onPress={() => {
                        setContentUserId(person.id);
                        setTab("content");
                      }}
                    >
                      <Text style={styles.actionText}>Uploads</Text>
                    </Pressable>
                    {person.banned ? (
                      <Pressable style={styles.action} onPress={() => run(person.id, () => api.unbanUser(token, person.id))}>
                        <Text style={styles.actionText}>Unban</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.action}
                        onPress={() => {
                          setDeleteTarget(null);
                          setBanTarget(person);
                          setReason(person.banReason);
                        }}
                      >
                        <Text style={styles.actionText}>Ban</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.action, styles.danger]}
                      onPress={() => {
                        setBanTarget(null);
                        setDeleteTarget(person);
                      }}
                    >
                      <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          : null}

        {tab === "reports"
          ? reports.map((report) => (
              <View key={report.id} style={styles.card}>
                <View style={styles.row}>
                  <Avatar name={report.user.displayName} photoUrl={report.user.photoUrl} />
                  <View style={styles.grow}>
                    <Text style={styles.name}>{report.user.displayName}</Text>
                    <Text style={styles.meta}>
                      Reported by {report.reporterName} · {report.status === "open" ? "Open" : "Reviewed"}
                      {report.user.banned ? " · Banned" : ""}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reason}>{report.reason}</Text>
                <View style={styles.actions}>
                  {report.status === "open" ? (
                    <Pressable style={styles.action} onPress={() => run(report.id, () => api.reviewReport(token, report.id))}>
                      <Text style={styles.actionText}>Mark reviewed</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.action}
                    onPress={() => {
                      setContentUserId(report.user.id);
                      setTab("content");
                    }}
                  >
                    <Text style={styles.actionText}>Uploads</Text>
                  </Pressable>
                  {!report.user.banned && report.user.role !== "admin" ? (
                    <Pressable
                      style={[styles.action, styles.danger]}
                      onPress={() => {
                        setBanTarget(report.user);
                        setReason(report.reason);
                      }}
                    >
                      <Text style={[styles.actionText, styles.dangerText]}>Ban</Text>
                    </Pressable>
                  ) : null}
                  {report.user.role !== "admin" ? (
                    <Pressable
                      style={[styles.action, styles.danger]}
                      onPress={() => {
                        setBanTarget(null);
                        setDeleteTarget(report.user);
                      }}
                    >
                      <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          : null}

        {tab === "reports" && reports.length === 0 ? <Text style={styles.empty}>No reports yet.</Text> : null}

        {tab === "content"
          ? items.map((item) => {
              const photo = mediaUrl(item.url);
              return (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.kind}>{kindLabel[item.kind] || item.kind}</Text>
                  <Text style={styles.name}>{item.displayName}</Text>
                  <Text style={styles.meta}>
                    {item.email}
                    {item.banned ? " · Banned" : ""}
                  </Text>
                  {photo && item.kind !== "file" ? (
                    <Image source={{ uri: photo }} style={styles.preview} resizeMode="contain" />
                  ) : null}
                  {item.body ? <Text style={styles.reason}>{item.body}</Text> : null}
                  {!item.banned ? (
                    <Pressable
                      style={[styles.action, styles.danger, { marginTop: 12 }]}
                      onPress={() => {
                        const person = users.find((entry) => entry.id === item.userId);
                        setTab("people");
                        setBanTarget(
                          person || {
                            id: item.userId,
                            email: item.email,
                            displayName: item.displayName,
                            age: 0,
                            city: "",
                            photoUrl: item.kind === "profile" ? item.url : null,
                            role: "user",
                            banned: false,
                            banReason: "",
                            reportCount: 0,
                            createdAt: item.createdAt,
                          }
                        );
                        setReason(item.kind === "message" ? "Reported message" : "Uploaded content");
                      }}
                    >
                      <Text style={[styles.actionText, styles.dangerText]}>Ban</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          : null}

        {tab === "content" && items.length === 0 ? <Text style={styles.empty}>No uploads yet.</Text> : null}

        {tab === "support"
          ? requests.map((request) => (
              <View key={request.id} style={styles.card}>
                <Text style={styles.kind}>{request.topic}</Text>
                <Text style={styles.name}>{request.displayName || request.email}</Text>
                <Text style={styles.meta}>
                  {request.email} · {request.status === "open" ? "Open" : "Closed"}
                </Text>
                <Text style={styles.reason}>{request.message}</Text>
                {request.status === "open" ? (
                  <Pressable style={[styles.action, { marginTop: 12 }]} onPress={() => run(request.id, () => api.closeSupport(token, request.id))}>
                    <Text style={styles.actionText}>Mark closed</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          : null}

        {tab === "support" && requests.length === 0 ? <Text style={styles.empty}>No support messages yet.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, paddingBottom: 48, maxWidth: 720, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  note: { color: colors.muted, marginTop: 8, fontSize: 15, lineHeight: 22 },
  signOut: { paddingVertical: 8, paddingHorizontal: 4 },
  signOutText: { color: colors.plum, fontWeight: "700" },
  option: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.line },
  tabs: { flexDirection: "row", gap: 8, marginTop: 18 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  tabOn: { backgroundColor: colors.plum, borderColor: colors.plum },
  tabText: { color: colors.ink, fontWeight: "700" },
  tabTextOn: { color: colors.white },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginTop: 14, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  grow: { flex: 1 },
  name: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  meta: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  reason: { color: colors.ink, marginTop: 10, lineHeight: 22 },
  kind: { color: colors.plum, fontSize: 12, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  action: { borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingVertical: 10, paddingHorizontal: 14 },
  actionText: { color: colors.ink, fontWeight: "700" },
  danger: { borderColor: colors.coral },
  dangerText: { color: colors.coral },
  preview: { width: "100%", height: 280, marginTop: 12, borderRadius: 12, backgroundColor: "#243044" },
  empty: { color: colors.muted, marginTop: 24, textAlign: "center" },
});
