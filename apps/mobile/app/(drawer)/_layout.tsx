import { Drawer } from 'expo-router/drawer'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'

function CustomDrawerContent({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [activeRoute, setActiveRoute] = useState('index')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (u) {
        setUser(u)
        supabase.from('profiles').select('*').eq('id', u.id).single().then(({ data }) => setProfile(data))
      }
    })
  }, [])

  const menuItems = [
    { key: 'index', label: 'Descobrir', icon: 'compass-outline' as const },
    { key: 'buscar', label: 'Buscar', icon: 'search-outline' as const },
    { key: 'favoritos', label: 'Favoritos', icon: 'heart-outline' as const },
    { key: 'biblioteca', label: 'Biblioteca', icon: 'library-outline' as const },
    { key: 'configuracoes', label: 'Configurações', icon: 'settings-outline' as const },
  ]

  const navigate = (key: string) => {
    setActiveRoute(key)
    navigation.closeDrawer()
    router.push(`/(drawer)/${key === 'index' ? '' : key}`)
  }

  return (
    <View style={[styles.drawerContainer, { paddingTop: insets.top }]}>
      <View style={styles.drawerHeader}>
        <Image
          source={{ uri: profile?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=FF6A00&color=fff' }}
          style={styles.avatar}
        />
        <Text style={styles.userName}>{profile?.display_name || user?.email?.split('@')[0] || 'Visitante'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>

      <ScrollView style={styles.drawerItems}>
        {menuItems.map(item => {
          const isActive = activeRoute === (item.key === 'index' ? '' : item.key) || (activeRoute === 'index' && item.key === 'index')
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.drawerItem, isActive && styles.drawerItemActive]}
              onPress={() => navigate(item.key)}
            >
              {isActive && <View style={styles.activeIndicator} />}
              <Ionicons name={item.icon} size={22} color={isActive ? colors.accentSolid : colors.textSecondary} />
              <Text style={[styles.drawerItemLabel, isActive && styles.drawerItemLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View style={styles.drawerFooter}>
        <Text style={styles.versionText}>EmberMusic v1.0.0</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await supabase.auth.signOut()
            router.replace('/auth/login')
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={({ navigation }) => <CustomDrawerContent navigation={navigation} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: '75%', backgroundColor: colors.bgSurface },
        swipeEdgeWidth: 40,
        swipeMinDistance: 10,
      }}
    />
  )
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: colors.bgSurface },
  drawerHeader: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: colors.bgElevated },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 12 },
  userName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  drawerItems: { flex: 1, paddingTop: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, position: 'relative' },
  drawerItemActive: { backgroundColor: colors.accentMuted },
  activeIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.accentSolid },
  drawerItemLabel: { fontSize: 16, color: colors.textSecondary, marginLeft: 16 },
  drawerItemLabelActive: { color: colors.textPrimary, fontWeight: '600' },
  drawerFooter: { padding: 20, borderTopWidth: 1, borderTopColor: colors.bgElevated },
  versionText: { fontSize: 12, color: colors.textDisabled, marginBottom: 12 },
  logoutButton: { flexDirection: 'row', alignItems: 'center' },
  logoutText: { color: colors.error, fontSize: 15, marginLeft: 8 },
})
