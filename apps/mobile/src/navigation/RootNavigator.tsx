import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CatalogScreen } from '../screens/client/CatalogScreen';
import { InventoryScreen } from '../screens/client/InventoryScreen';
import { CartScreen } from '../screens/client/CartScreen';
import { OrdersScreen } from '../screens/client/OrdersScreen';
import { OrderDetailScreen } from '../screens/client/OrderDetailScreen';
import { UploadCatalogScreen } from '../screens/admin/UploadCatalogScreen';
import { PriceOrdersScreen } from '../screens/admin/PriceOrdersScreen';
import { PriceOrderDetailScreen } from '../screens/admin/PriceOrderDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { InvoicesScreen } from '../screens/invoices/InvoicesScreen';
import { InvoiceDetailScreen } from '../screens/invoices/InvoiceDetailScreen';
import { useCart } from '../context/CartContext';
import { colors } from '../theme';
import { ClientOrdersStackParamList, AdminOrdersStackParamList, InvoicesStackParamList } from './types';

const ClientTab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();
const ClientOrdersStack = createNativeStackNavigator<ClientOrdersStackParamList>();
const AdminOrdersStack = createNativeStackNavigator<AdminOrdersStackParamList>();
const InvoicesStack = createNativeStackNavigator<InvoicesStackParamList>();

function ClientOrdersNavigator() {
  return (
    <ClientOrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientOrdersStack.Screen name="OrdersList" component={OrdersScreen} />
      <ClientOrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </ClientOrdersStack.Navigator>
  );
}

function AdminOrdersNavigator() {
  return (
    <AdminOrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminOrdersStack.Screen name="PriceOrdersList" component={PriceOrdersScreen} />
      <AdminOrdersStack.Screen name="PriceOrderDetail" component={PriceOrderDetailScreen} />
    </AdminOrdersStack.Navigator>
  );
}

function InvoicesNavigator() {
  return (
    <InvoicesStack.Navigator screenOptions={{ headerShown: false }}>
      <InvoicesStack.Screen name="InvoicesList" component={InvoicesScreen} />
      <InvoicesStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
    </InvoicesStack.Navigator>
  );
}

type TabIconProps = { color: string; size: number };
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName) {
  return ({ color, size }: TabIconProps) => <Ionicons name={name} size={size} color={color} />;
}

export function ClientNavigator() {
  const { totalUnits } = useCart();

  return (
    <ClientTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <ClientTab.Screen name="Catálogo" component={CatalogScreen} options={{ tabBarIcon: tabIcon('document-text-outline') }} />
      <ClientTab.Screen name="Inventario" component={InventoryScreen} options={{ tabBarIcon: tabIcon('cube-outline') }} />
      <ClientTab.Screen
        name="Pedido"
        component={CartScreen}
        options={{ tabBarBadge: totalUnits > 0 ? totalUnits : undefined, tabBarIcon: tabIcon('cart-outline') }}
      />
      <ClientTab.Screen name="Pedidos" component={ClientOrdersNavigator} options={{ tabBarIcon: tabIcon('list-outline') }} />
      <ClientTab.Screen name="Facturas" component={InvoicesNavigator} options={{ tabBarIcon: tabIcon('receipt-outline') }} />
      <ClientTab.Screen name="Cuenta" component={ProfileScreen} options={{ tabBarIcon: tabIcon('person-outline') }} />
    </ClientTab.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { height: 60, paddingBottom: 8 },
      }}
    >
      <AdminTab.Screen name="Catálogo PDF" component={UploadCatalogScreen} options={{ tabBarIcon: tabIcon('cloud-upload-outline') }} />
      <AdminTab.Screen name="Precios" component={AdminOrdersNavigator} options={{ tabBarIcon: tabIcon('cash-outline') }} />
      <AdminTab.Screen name="Facturas" component={InvoicesNavigator} options={{ tabBarIcon: tabIcon('receipt-outline') }} />
      <AdminTab.Screen
        name="Inventario"
        component={() => <InventoryScreen showAddToCart={false} />}
        options={{ tabBarIcon: tabIcon('cube-outline') }}
      />
      <AdminTab.Screen name="Cuenta" component={ProfileScreen} options={{ tabBarIcon: tabIcon('person-outline') }} />
    </AdminTab.Navigator>
  );
}
