import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// ===== 定数・型定義 =====
const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E55A2B',
  background: '#FFF5E6',
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray: '#666666',
  lightGray: '#E0E0E0',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',
  fuel: '#FF6B35',
  maintenance: '#2196F3',
};

const FUEL_TYPES = [
  { id: 'regular', name: 'レギュラー', icon: '⛽', color: '#4CAF50' },
  { id: 'premium', name: 'ハイオク', icon: '⛽', color: '#FF9800' },
  { id: 'diesel', name: '軽油', icon: '⛽', color: '#795548' },
  { id: 'ev', name: '電気', icon: '🔌', color: '#2196F3' },
];

const MAINTENANCE_TYPES = [
  { id: 'oil', name: 'オイル交換', icon: '🛢️', color: '#8B4513', intervalKm: 5000 },
  { id: 'tire', name: 'タイヤ', icon: '🛞', color: '#333333', intervalKm: 40000 },
  { id: 'battery', name: 'バッテリー', icon: '🔋', color: '#4CAF50', intervalKm: 30000 },
  { id: 'brake', name: 'ブレーキ', icon: '🛑', color: '#F44336', intervalKm: 30000 },
  { id: 'filter', name: 'フィルター', icon: '🌀', color: '#9C27B0', intervalKm: 15000 },
  { id: 'wiper', name: 'ワイパー', icon: '🌧️', color: '#03A9F4', intervalKm: 10000 },
  { id: 'coolant', name: '冷却水', icon: '💧', color: '#00BCD4', intervalKm: 20000 },
  { id: 'inspection', name: '車検', icon: '📋', color: '#607D8B', intervalKm: 0 },
  { id: 'insurance', name: '保険', icon: '🛡️', color: '#3F51B5', intervalKm: 0 },
  { id: 'wash', name: '洗車', icon: '🚿', color: '#00BCD4', intervalKm: 0 },
  { id: 'other', name: 'その他', icon: '🔧', color: '#9E9E9E', intervalKm: 0 },
];

const STORAGE_KEY = '@dodo_car_data';
const VEHICLE_KEY = '@dodo_car_vehicles';

interface FuelRecord {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number; // 走行距離(km)
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fuelType: string;
  fullTank: boolean;
  station?: string;
  memo?: string;
  createdAt: number;
}

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  type: string;
  cost: number;
  description: string;
  nextOdometer?: number;
  nextDate?: string;
  memo?: string;
  createdAt: number;
}

interface Vehicle {
  id: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  fuelType: string;
  tankCapacity?: number;
  initialOdometer: number;
  icon: string;
  createdAt: number;
}

type TabType = 'fuel' | 'maintenance' | 'stats' | 'vehicles';
type ModalType = 'fuel' | 'maintenance' | 'vehicle' | null;

// ===== ユーティリティ =====
const formatCurrency = (amount: number): string => {
  return `¥${amount.toLocaleString()}`;
};

const formatNumber = (num: number, decimals: number = 1): string => {
  return num.toFixed(decimals);
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getFuelType = (typeId: string) => {
  return FUEL_TYPES.find(t => t.id === typeId) || FUEL_TYPES[0];
};

const getMaintenanceType = (typeId: string) => {
  return MAINTENANCE_TYPES.find(t => t.id === typeId) || MAINTENANCE_TYPES[MAINTENANCE_TYPES.length - 1];
};

const calculateFuelEfficiency = (
  currentOdometer: number,
  previousOdometer: number,
  liters: number
): number => {
  const distance = currentOdometer - previousOdometer;
  if (distance <= 0 || liters <= 0) return 0;
  return distance / liters;
};

// ===== コンポーネント =====

// 車両サマリーカード
const VehicleSummaryCard: React.FC<{
  vehicle: Vehicle;
  fuelRecords: FuelRecord[];
  maintenanceRecords: MaintenanceRecord[];
  onSelectVehicle: () => void;
}> = ({ vehicle, fuelRecords, maintenanceRecords, onSelectVehicle }) => {
  const latestFuel = fuelRecords[0];
  const currentOdometer = latestFuel?.odometer || vehicle.initialOdometer;
  
  // 燃費計算 (直近の満タン給油間)
  const avgEfficiency = useMemo(() => {
    const fullTankRecords = fuelRecords.filter(r => r.fullTank);
    if (fullTankRecords.length < 2) return null;
    
    let totalDistance = 0;
    let totalLiters = 0;
    
    for (let i = 0; i < fullTankRecords.length - 1; i++) {
      totalDistance += fullTankRecords[i].odometer - fullTankRecords[i + 1].odometer;
      totalLiters += fullTankRecords[i].liters;
    }
    
    return totalLiters > 0 ? totalDistance / totalLiters : null;
  }, [fuelRecords]);

  // 今月のコスト
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthKey = getMonthKey(now);
    
    const monthFuel = fuelRecords.filter(r => r.date.startsWith(monthKey));
    const monthMaintenance = maintenanceRecords.filter(r => r.date.startsWith(monthKey));
    
    return {
      fuelCost: monthFuel.reduce((sum, r) => sum + r.totalCost, 0),
      maintenanceCost: monthMaintenance.reduce((sum, r) => sum + r.cost, 0),
      fuelLiters: monthFuel.reduce((sum, r) => sum + r.liters, 0),
      fuelCount: monthFuel.length,
    };
  }, [fuelRecords, maintenanceRecords]);

  const totalMonthlyCost = monthlyStats.fuelCost + monthlyStats.maintenanceCost;

  return (
    <TouchableOpacity style={styles.summaryCard} onPress={onSelectVehicle} activeOpacity={0.8}>
      <View style={styles.vehicleHeader}>
        <Text style={styles.vehicleIcon}>{vehicle.icon}</Text>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{vehicle.name}</Text>
          <Text style={styles.vehicleDetails}>
            {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
          </Text>
        </View>
        <View style={styles.odometerBadge}>
          <Text style={styles.odometerValue}>{currentOdometer.toLocaleString()}</Text>
          <Text style={styles.odometerUnit}>km</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>今月の燃料費</Text>
          <Text style={[styles.statValue, { color: COLORS.fuel }]}>
            {formatCurrency(monthlyStats.fuelCost)}
          </Text>
          <Text style={styles.statSub}>{monthlyStats.fuelCount}回 / {formatNumber(monthlyStats.fuelLiters, 1)}L</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>今月の整備費</Text>
          <Text style={[styles.statValue, { color: COLORS.maintenance }]}>
            {formatCurrency(monthlyStats.maintenanceCost)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>平均燃費</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {avgEfficiency ? `${formatNumber(avgEfficiency)} km/L` : '---'}
          </Text>
        </View>
      </View>

      <View style={styles.totalCostBar}>
        <Text style={styles.totalCostLabel}>今月の総コスト</Text>
        <Text style={styles.totalCostValue}>{formatCurrency(totalMonthlyCost)}</Text>
      </View>
    </TouchableOpacity>
  );
};

// タブバー
const TabBar: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}> = ({ activeTab, onTabChange }) => {
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'fuel', label: '給油', icon: '⛽' },
    { key: 'maintenance', label: '整備', icon: '🔧' },
    { key: 'stats', label: '統計', icon: '📊' },
    { key: 'vehicles', label: '車両', icon: '🚗' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => onTabChange(tab.key)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// 給油記録アイテム
const FuelRecordItem: React.FC<{
  record: FuelRecord;
  previousRecord?: FuelRecord;
  onPress: () => void;
  onDelete: () => void;
}> = ({ record, previousRecord, onPress, onDelete }) => {
  const fuelType = getFuelType(record.fuelType);
  const efficiency = previousRecord
    ? calculateFuelEfficiency(record.odometer, previousRecord.odometer, record.liters)
    : null;

  return (
    <TouchableOpacity style={styles.recordItem} onPress={onPress} onLongPress={onDelete}>
      <View style={styles.recordLeft}>
        <View style={[styles.recordIconBg, { backgroundColor: fuelType.color + '20' }]}>
          <Text style={styles.recordIcon}>{fuelType.icon}</Text>
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
          <Text style={styles.recordOdometer}>{record.odometer.toLocaleString()} km</Text>
          {record.station && <Text style={styles.recordStation}>{record.station}</Text>}
        </View>
      </View>
      <View style={styles.recordRight}>
        <Text style={styles.recordCost}>{formatCurrency(record.totalCost)}</Text>
        <Text style={styles.recordLiters}>{formatNumber(record.liters, 2)}L @ ¥{record.pricePerLiter}</Text>
        {efficiency !== null && efficiency > 0 && (
          <View style={styles.efficiencyBadge}>
            <Text style={styles.efficiencyValue}>{formatNumber(efficiency)} km/L</Text>
          </View>
        )}
      </View>
      {record.fullTank && <View style={styles.fullTankBadge}><Text style={styles.fullTankText}>満</Text></View>}
    </TouchableOpacity>
  );
};

// 整備記録アイテム
const MaintenanceRecordItem: React.FC<{
  record: MaintenanceRecord;
  onPress: () => void;
  onDelete: () => void;
}> = ({ record, onPress, onDelete }) => {
  const maintenanceType = getMaintenanceType(record.type);

  return (
    <TouchableOpacity style={styles.recordItem} onPress={onPress} onLongPress={onDelete}>
      <View style={styles.recordLeft}>
        <View style={[styles.recordIconBg, { backgroundColor: maintenanceType.color + '20' }]}>
          <Text style={styles.recordIcon}>{maintenanceType.icon}</Text>
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle}>{maintenanceType.name}</Text>
          <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
          <Text style={styles.recordOdometer}>{record.odometer.toLocaleString()} km</Text>
        </View>
      </View>
      <View style={styles.recordRight}>
        <Text style={styles.recordCost}>{formatCurrency(record.cost)}</Text>
        {record.description && (
          <Text style={styles.recordDescription} numberOfLines={1}>{record.description}</Text>
        )}
        {record.nextOdometer && (
          <Text style={styles.nextService}>次回: {record.nextOdometer.toLocaleString()} km</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// 月間コストグラフ
const MonthlyCostChart: React.FC<{
  fuelRecords: FuelRecord[];
  maintenanceRecords: MaintenanceRecord[];
}> = ({ fuelRecords, maintenanceRecords }) => {
  const monthlyData = useMemo(() => {
    const data: { [key: string]: { fuel: number; maintenance: number } } = {};
    const now = new Date();
    
    // 過去6ヶ月分
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      data[key] = { fuel: 0, maintenance: 0 };
    }

    fuelRecords.forEach(r => {
      const key = r.date.substring(0, 7);
      if (data[key]) {
        data[key].fuel += r.totalCost;
      }
    });

    maintenanceRecords.forEach(r => {
      const key = r.date.substring(0, 7);
      if (data[key]) {
        data[key].maintenance += r.cost;
      }
    });

    return Object.entries(data).map(([month, costs]) => ({
      month,
      label: month.split('-')[1] + '月',
      ...costs,
      total: costs.fuel + costs.maintenance,
    }));
  }, [fuelRecords, maintenanceRecords]);

  const maxValue = Math.max(...monthlyData.map(d => d.total), 1);
  const chartHeight = 150;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>📊 月間コスト推移</Text>
      <View style={styles.chart}>
        {monthlyData.map((data, index) => {
          const fuelHeight = (data.fuel / maxValue) * chartHeight;
          const maintenanceHeight = (data.maintenance / maxValue) * chartHeight;
          
          return (
            <View key={data.month} style={styles.chartBar}>
              <View style={styles.barContainer}>
                <View style={[styles.barSegment, { height: maintenanceHeight, backgroundColor: COLORS.maintenance }]} />
                <View style={[styles.barSegment, { height: fuelHeight, backgroundColor: COLORS.fuel }]} />
              </View>
              <Text style={styles.barLabel}>{data.label}</Text>
              <Text style={styles.barValue}>¥{(data.total / 1000).toFixed(0)}k</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.fuel }]} />
          <Text style={styles.legendText}>燃料費</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.maintenance }]} />
          <Text style={styles.legendText}>整備費</Text>
        </View>
      </View>
    </View>
  );
};

// 燃費トレンドグラフ
const EfficiencyChart: React.FC<{
  fuelRecords: FuelRecord[];
}> = ({ fuelRecords }) => {
  const efficiencyData = useMemo(() => {
    const sorted = [...fuelRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const data: { date: string; efficiency: number }[] = [];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].fullTank) {
        const eff = calculateFuelEfficiency(sorted[i].odometer, sorted[i - 1].odometer, sorted[i].liters);
        if (eff > 0 && eff < 50) { // 妥当な範囲
          data.push({ date: sorted[i].date, efficiency: eff });
        }
      }
    }

    return data.slice(-10); // 直近10回
  }, [fuelRecords]);

  if (efficiencyData.length < 2) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>📈 燃費トレンド</Text>
        <Text style={styles.noDataText}>満タン給油を2回以上記録すると燃費が表示されます</Text>
      </View>
    );
  }

  const maxEff = Math.max(...efficiencyData.map(d => d.efficiency));
  const minEff = Math.min(...efficiencyData.map(d => d.efficiency));
  const avgEff = efficiencyData.reduce((sum, d) => sum + d.efficiency, 0) / efficiencyData.length;
  const chartHeight = 100;
  const range = maxEff - minEff || 1;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>📈 燃費トレンド</Text>
      <View style={styles.efficiencyStats}>
        <View style={styles.effStatItem}>
          <Text style={styles.effStatLabel}>平均</Text>
          <Text style={styles.effStatValue}>{formatNumber(avgEff)} km/L</Text>
        </View>
        <View style={styles.effStatItem}>
          <Text style={styles.effStatLabel}>最高</Text>
          <Text style={[styles.effStatValue, { color: COLORS.success }]}>{formatNumber(maxEff)} km/L</Text>
        </View>
        <View style={styles.effStatItem}>
          <Text style={styles.effStatLabel}>最低</Text>
          <Text style={[styles.effStatValue, { color: COLORS.danger }]}>{formatNumber(minEff)} km/L</Text>
        </View>
      </View>
      <View style={styles.lineChart}>
        {efficiencyData.map((data, index) => {
          const height = ((data.efficiency - minEff) / range) * chartHeight + 20;
          return (
            <View key={index} style={styles.lineChartPoint}>
              <View style={[styles.point, { bottom: height }]}>
                <Text style={styles.pointValue}>{formatNumber(data.efficiency, 1)}</Text>
              </View>
              <View style={[styles.pointBar, { height: height }]} />
              <Text style={styles.pointLabel}>{formatShortDate(data.date)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// メンテナンスアラート
const MaintenanceAlerts: React.FC<{
  currentOdometer: number;
  maintenanceRecords: MaintenanceRecord[];
}> = ({ currentOdometer, maintenanceRecords }) => {
  const alerts = useMemo(() => {
    const alertList: { type: string; message: string; urgency: 'warning' | 'danger' }[] = [];

    MAINTENANCE_TYPES.filter(t => t.intervalKm > 0).forEach(mType => {
      const lastRecord = maintenanceRecords
        .filter(r => r.type === mType.id)
        .sort((a, b) => b.odometer - a.odometer)[0];

      if (lastRecord) {
        const kmSince = currentOdometer - lastRecord.odometer;
        const remaining = mType.intervalKm - kmSince;

        if (remaining < 0) {
          alertList.push({
            type: mType.id,
            message: `${mType.icon} ${mType.name}: ${Math.abs(remaining).toLocaleString()}km 超過`,
            urgency: 'danger',
          });
        } else if (remaining < mType.intervalKm * 0.2) {
          alertList.push({
            type: mType.id,
            message: `${mType.icon} ${mType.name}: あと ${remaining.toLocaleString()}km`,
            urgency: 'warning',
          });
        }
      }
    });

    return alertList;
  }, [currentOdometer, maintenanceRecords]);

  if (alerts.length === 0) return null;

  return (
    <View style={styles.alertContainer}>
      <Text style={styles.alertTitle}>⚠️ メンテナンスアラート</Text>
      {alerts.map((alert, index) => (
        <View
          key={index}
          style={[
            styles.alertItem,
            { backgroundColor: alert.urgency === 'danger' ? COLORS.danger + '20' : COLORS.warning + '20' },
          ]}
        >
          <Text style={[
            styles.alertText,
            { color: alert.urgency === 'danger' ? COLORS.danger : COLORS.warning }
          ]}>
            {alert.message}
          </Text>
        </View>
      ))}
    </View>
  );
};

// 給油入力モーダル
const FuelInputModal: React.FC<{
  visible: boolean;
  vehicleId: string;
  lastOdometer: number;
  editingRecord?: FuelRecord;
  onSave: (record: Omit<FuelRecord, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}> = ({ visible, vehicleId, lastOdometer, editingRecord, onSave, onClose }) => {
  const [date, setDate] = useState(editingRecord?.date || new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState(editingRecord?.odometer.toString() || '');
  const [liters, setLiters] = useState(editingRecord?.liters.toString() || '');
  const [pricePerLiter, setPricePerLiter] = useState(editingRecord?.pricePerLiter.toString() || '');
  const [fuelType, setFuelType] = useState(editingRecord?.fuelType || 'regular');
  const [fullTank, setFullTank] = useState(editingRecord?.fullTank ?? true);
  const [station, setStation] = useState(editingRecord?.station || '');
  const [memo, setMemo] = useState(editingRecord?.memo || '');

  const totalCost = (parseFloat(liters) || 0) * (parseFloat(pricePerLiter) || 0);

  const handleSave = () => {
    const odoValue = parseFloat(odometer);
    const litersValue = parseFloat(liters);
    const priceValue = parseFloat(pricePerLiter);

    if (!odoValue || !litersValue || !priceValue) {
      Alert.alert('エラー', '走行距離、給油量、単価を入力してください');
      return;
    }

    if (odoValue < lastOdometer && !editingRecord) {
      Alert.alert('エラー', `走行距離は前回(${lastOdometer}km)より大きい値を入力してください`);
      return;
    }

    onSave({
      vehicleId,
      date,
      odometer: odoValue,
      liters: litersValue,
      pricePerLiter: priceValue,
      totalCost: litersValue * priceValue,
      fuelType,
      fullTank,
      station: station || undefined,
      memo: memo || undefined,
    });

    // Reset form
    setOdometer('');
    setLiters('');
    setStation('');
    setMemo('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>⛽ 給油記録</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>日付</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>走行距離 (km)</Text>
              <TextInput
                style={styles.input}
                value={odometer}
                onChangeText={setOdometer}
                placeholder={`前回: ${lastOdometer} km`}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>給油量 (L)</Text>
                <TextInput
                  style={styles.input}
                  value={liters}
                  onChangeText={setLiters}
                  placeholder="30.5"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.inputLabel}>単価 (¥/L)</Text>
                <TextInput
                  style={styles.input}
                  value={pricePerLiter}
                  onChangeText={setPricePerLiter}
                  placeholder="165"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.totalDisplay}>
              <Text style={styles.totalLabel}>合計金額</Text>
              <Text style={styles.totalValue}>{formatCurrency(Math.round(totalCost))}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>燃料タイプ</Text>
              <View style={styles.typeSelector}>
                {FUEL_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      fuelType === type.id && { backgroundColor: type.color, borderColor: type.color },
                    ]}
                    onPress={() => setFuelType(type.id)}
                  >
                    <Text style={[styles.typeOptionText, fuelType === type.id && { color: '#FFF' }]}>
                      {type.icon} {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFullTank(!fullTank)}
            >
              <View style={[styles.checkbox, fullTank && styles.checkboxChecked]}>
                {fullTank && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>満タン給油</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>給油所（任意）</Text>
              <TextInput
                style={styles.input}
                value={station}
                onChangeText={setStation}
                placeholder="ENEOS 〇〇店"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>メモ（任意）</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={memo}
                onChangeText={setMemo}
                placeholder="メモ"
                multiline
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 整備記録入力モーダル
const MaintenanceInputModal: React.FC<{
  visible: boolean;
  vehicleId: string;
  currentOdometer: number;
  editingRecord?: MaintenanceRecord;
  onSave: (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}> = ({ visible, vehicleId, currentOdometer, editingRecord, onSave, onClose }) => {
  const [date, setDate] = useState(editingRecord?.date || new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState(editingRecord?.odometer.toString() || currentOdometer.toString());
  const [type, setType] = useState(editingRecord?.type || 'oil');
  const [cost, setCost] = useState(editingRecord?.cost.toString() || '');
  const [description, setDescription] = useState(editingRecord?.description || '');
  const [nextOdometer, setNextOdometer] = useState(editingRecord?.nextOdometer?.toString() || '');
  const [memo, setMemo] = useState(editingRecord?.memo || '');

  const selectedType = getMaintenanceType(type);

  const handleTypeChange = (typeId: string) => {
    setType(typeId);
    const mType = getMaintenanceType(typeId);
    if (mType.intervalKm > 0) {
      const odo = parseFloat(odometer) || currentOdometer;
      setNextOdometer((odo + mType.intervalKm).toString());
    } else {
      setNextOdometer('');
    }
  };

  const handleSave = () => {
    const odoValue = parseFloat(odometer);
    const costValue = parseFloat(cost);

    if (!odoValue) {
      Alert.alert('エラー', '走行距離を入力してください');
      return;
    }

    onSave({
      vehicleId,
      date,
      odometer: odoValue,
      type,
      cost: costValue || 0,
      description,
      nextOdometer: parseFloat(nextOdometer) || undefined,
      memo: memo || undefined,
    });

    // Reset
    setCost('');
    setDescription('');
    setMemo('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔧 整備記録</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>整備タイプ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeSelector}>
                  {MAINTENANCE_TYPES.map(mType => (
                    <TouchableOpacity
                      key={mType.id}
                      style={[
                        styles.typeOption,
                        type === mType.id && { backgroundColor: mType.color, borderColor: mType.color },
                      ]}
                      onPress={() => handleTypeChange(mType.id)}
                    >
                      <Text style={[styles.typeOptionText, type === mType.id && { color: '#FFF' }]}>
                        {mType.icon} {mType.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>日付</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>走行距離 (km)</Text>
                <TextInput
                  style={styles.input}
                  value={odometer}
                  onChangeText={setOdometer}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.inputLabel}>費用 (¥)</Text>
                <TextInput
                  style={styles.input}
                  value={cost}
                  onChangeText={setCost}
                  placeholder="5000"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>内容</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder={`${selectedType.name}の詳細`}
              />
            </View>

            {selectedType.intervalKm > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>次回実施距離 (km)</Text>
                <TextInput
                  style={styles.input}
                  value={nextOdometer}
                  onChangeText={setNextOdometer}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>メモ（任意）</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={memo}
                onChangeText={setMemo}
                placeholder="メモ"
                multiline
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 車両入力モーダル
const VehicleInputModal: React.FC<{
  visible: boolean;
  editingVehicle?: Vehicle;
  onSave: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}> = ({ visible, editingVehicle, onSave, onClose }) => {
  const [name, setName] = useState(editingVehicle?.name || '');
  const [make, setMake] = useState(editingVehicle?.make || '');
  const [model, setModel] = useState(editingVehicle?.model || '');
  const [year, setYear] = useState(editingVehicle?.year?.toString() || '');
  const [fuelType, setFuelType] = useState(editingVehicle?.fuelType || 'regular');
  const [tankCapacity, setTankCapacity] = useState(editingVehicle?.tankCapacity?.toString() || '');
  const [initialOdometer, setInitialOdometer] = useState(editingVehicle?.initialOdometer.toString() || '0');
  const [icon, setIcon] = useState(editingVehicle?.icon || '🚗');

  const icons = ['🚗', '🚙', '🚕', '🏎️', '🚐', '🚎', '🏍️', '🛵', '🚲'];

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('エラー', '車両名を入力してください');
      return;
    }

    onSave({
      name: name.trim(),
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      year: parseInt(year) || undefined,
      fuelType,
      tankCapacity: parseFloat(tankCapacity) || undefined,
      initialOdometer: parseFloat(initialOdometer) || 0,
      icon,
    });

    // Reset
    setName('');
    setMake('');
    setModel('');
    setYear('');
    setTankCapacity('');
    setInitialOdometer('0');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🚗 車両登録</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>アイコン</Text>
              <View style={styles.iconSelector}>
                {icons.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconOption, icon === ic && styles.iconOptionSelected]}
                    onPress={() => setIcon(ic)}
                  >
                    <Text style={styles.iconOptionText}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>車両名 *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="マイカー"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>メーカー</Text>
                <TextInput
                  style={styles.input}
                  value={make}
                  onChangeText={setMake}
                  placeholder="トヨタ"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.inputLabel}>車種</Text>
                <TextInput
                  style={styles.input}
                  value={model}
                  onChangeText={setModel}
                  placeholder="プリウス"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>年式</Text>
                <TextInput
                  style={styles.input}
                  value={year}
                  onChangeText={setYear}
                  placeholder="2020"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.inputLabel}>タンク容量 (L)</Text>
                <TextInput
                  style={styles.input}
                  value={tankCapacity}
                  onChangeText={setTankCapacity}
                  placeholder="50"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>燃料タイプ</Text>
              <View style={styles.typeSelector}>
                {FUEL_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      fuelType === type.id && { backgroundColor: type.color, borderColor: type.color },
                    ]}
                    onPress={() => setFuelType(type.id)}
                  >
                    <Text style={[styles.typeOptionText, fuelType === type.id && { color: '#FFF' }]}>
                      {type.icon} {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>現在の走行距離 (km)</Text>
              <TextInput
                style={styles.input}
                value={initialOdometer}
                onChangeText={setInitialOdometer}
                placeholder="50000"
                keyboardType="numeric"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 車両カード
const VehicleCard: React.FC<{
  vehicle: Vehicle;
  isSelected: boolean;
  fuelRecords: FuelRecord[];
  maintenanceRecords: MaintenanceRecord[];
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ vehicle, isSelected, fuelRecords, maintenanceRecords, onSelect, onEdit, onDelete }) => {
  const latestFuel = fuelRecords[0];
  const currentOdometer = latestFuel?.odometer || vehicle.initialOdometer;
  const totalFuelCost = fuelRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + r.cost, 0);

  return (
    <TouchableOpacity
      style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
      onPress={onSelect}
      onLongPress={() => {
        Alert.alert(vehicle.name, '操作を選択', [
          { text: '編集', onPress: onEdit },
          { text: '削除', onPress: onDelete, style: 'destructive' },
          { text: 'キャンセル', style: 'cancel' },
        ]);
      }}
    >
      <View style={styles.vehicleCardHeader}>
        <Text style={styles.vehicleCardIcon}>{vehicle.icon}</Text>
        <View style={styles.vehicleCardInfo}>
          <Text style={styles.vehicleCardName}>{vehicle.name}</Text>
          <Text style={styles.vehicleCardDetails}>
            {vehicle.make} {vehicle.model}
          </Text>
        </View>
        {isSelected && <Text style={styles.selectedBadge}>✓</Text>}
      </View>
      <View style={styles.vehicleCardStats}>
        <Text style={styles.vehicleCardStat}>📏 {currentOdometer.toLocaleString()} km</Text>
        <Text style={styles.vehicleCardStat}>⛽ {formatCurrency(totalFuelCost)}</Text>
        <Text style={styles.vehicleCardStat}>🔧 {formatCurrency(totalMaintenanceCost)}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ===== メインコンポーネント =====
const CarScreen: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('fuel');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingFuel, setEditingFuel] = useState<FuelRecord | undefined>();
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRecord | undefined>();
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();

  // データ読み込み
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [vehicleData, recordData] = await Promise.all([
        AsyncStorage.getItem(VEHICLE_KEY),
        AsyncStorage.getItem(STORAGE_KEY),
      ]);

      if (vehicleData) {
        const parsed = JSON.parse(vehicleData);
        setVehicles(parsed);
        if (parsed.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(parsed[0].id);
        }
      }

      if (recordData) {
        const parsed = JSON.parse(recordData);
        setFuelRecords(parsed.fuelRecords || []);
        setMaintenanceRecords(parsed.maintenanceRecords || []);
      }
    } catch (error) {
      console.error('Failed to load car data:', error);
    }
  };

  const saveData = async (
    newFuelRecords: FuelRecord[],
    newMaintenanceRecords: MaintenanceRecord[]
  ) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          fuelRecords: newFuelRecords,
          maintenanceRecords: newMaintenanceRecords,
        })
      );
    } catch (error) {
      console.error('Failed to save car data:', error);
    }
  };

  const saveVehicles = async (newVehicles: Vehicle[]) => {
    try {
      await AsyncStorage.setItem(VEHICLE_KEY, JSON.stringify(newVehicles));
    } catch (error) {
      console.error('Failed to save vehicles:', error);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  
  const vehicleFuelRecords = useMemo(() => {
    return fuelRecords
      .filter(r => r.vehicleId === selectedVehicleId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.odometer - a.odometer);
  }, [fuelRecords, selectedVehicleId]);

  const vehicleMaintenanceRecords = useMemo(() => {
    return maintenanceRecords
      .filter(r => r.vehicleId === selectedVehicleId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [maintenanceRecords, selectedVehicleId]);

  const currentOdometer = vehicleFuelRecords[0]?.odometer || selectedVehicle?.initialOdometer || 0;

  // 給油記録保存
  const handleSaveFuel = (record: Omit<FuelRecord, 'id' | 'createdAt'>) => {
    const newRecord: FuelRecord = {
      ...record,
      id: editingFuel?.id || Date.now().toString(),
      createdAt: editingFuel?.createdAt || Date.now(),
    };

    let newRecords: FuelRecord[];
    if (editingFuel) {
      newRecords = fuelRecords.map(r => (r.id === editingFuel.id ? newRecord : r));
    } else {
      newRecords = [...fuelRecords, newRecord];
    }

    setFuelRecords(newRecords);
    saveData(newRecords, maintenanceRecords);
    setModalType(null);
    setEditingFuel(undefined);
  };

  // 整備記録保存
  const handleSaveMaintenance = (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => {
    const newRecord: MaintenanceRecord = {
      ...record,
      id: editingMaintenance?.id || Date.now().toString(),
      createdAt: editingMaintenance?.createdAt || Date.now(),
    };

    let newRecords: MaintenanceRecord[];
    if (editingMaintenance) {
      newRecords = maintenanceRecords.map(r => (r.id === editingMaintenance.id ? newRecord : r));
    } else {
      newRecords = [...maintenanceRecords, newRecord];
    }

    setMaintenanceRecords(newRecords);
    saveData(fuelRecords, newRecords);
    setModalType(null);
    setEditingMaintenance(undefined);
  };

  // 車両保存
  const handleSaveVehicle = (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: editingVehicle?.id || Date.now().toString(),
      createdAt: editingVehicle?.createdAt || Date.now(),
    };

    let newVehicles: Vehicle[];
    if (editingVehicle) {
      newVehicles = vehicles.map(v => (v.id === editingVehicle.id ? newVehicle : v));
    } else {
      newVehicles = [...vehicles, newVehicle];
    }

    setVehicles(newVehicles);
    saveVehicles(newVehicles);
    
    if (!selectedVehicleId) {
      setSelectedVehicleId(newVehicle.id);
    }
    
    setModalType(null);
    setEditingVehicle(undefined);
  };

  // 削除
  const handleDeleteFuel = (record: FuelRecord) => {
    Alert.alert('削除確認', 'この給油記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          const newRecords = fuelRecords.filter(r => r.id !== record.id);
          setFuelRecords(newRecords);
          saveData(newRecords, maintenanceRecords);
        },
      },
    ]);
  };

  const handleDeleteMaintenance = (record: MaintenanceRecord) => {
    Alert.alert('削除確認', 'この整備記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          const newRecords = maintenanceRecords.filter(r => r.id !== record.id);
          setMaintenanceRecords(newRecords);
          saveData(fuelRecords, newRecords);
        },
      },
    ]);
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert('削除確認', `${vehicle.name}を削除しますか？関連する全ての記録も削除されます。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          const newVehicles = vehicles.filter(v => v.id !== vehicle.id);
          const newFuelRecords = fuelRecords.filter(r => r.vehicleId !== vehicle.id);
          const newMaintenanceRecords = maintenanceRecords.filter(r => r.vehicleId !== vehicle.id);

          setVehicles(newVehicles);
          setFuelRecords(newFuelRecords);
          setMaintenanceRecords(newMaintenanceRecords);
          
          saveVehicles(newVehicles);
          saveData(newFuelRecords, newMaintenanceRecords);

          if (selectedVehicleId === vehicle.id) {
            setSelectedVehicleId(newVehicles[0]?.id || null);
          }
        },
      },
    ]);
  };

  // FAB押下
  const handleFabPress = () => {
    if (activeTab === 'vehicles') {
      setEditingVehicle(undefined);
      setModalType('vehicle');
    } else if (activeTab === 'fuel') {
      if (!selectedVehicleId) {
        Alert.alert('車両未登録', '先に車両を登録してください', [
          { text: 'OK', onPress: () => setActiveTab('vehicles') },
        ]);
        return;
      }
      setEditingFuel(undefined);
      setModalType('fuel');
    } else if (activeTab === 'maintenance') {
      if (!selectedVehicleId) {
        Alert.alert('車両未登録', '先に車両を登録してください', [
          { text: 'OK', onPress: () => setActiveTab('vehicles') },
        ]);
        return;
      }
      setEditingMaintenance(undefined);
      setModalType('maintenance');
    }
  };

  // 車両未登録時
  if (vehicles.length === 0 && activeTab !== 'vehicles') {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>車両を登録しよう</Text>
          <Text style={styles.emptyText}>まずは車両を登録して、燃費と整備を管理しましょう</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setModalType('vehicle')}
          >
            <Text style={styles.emptyButtonText}>+ 車両を登録</Text>
          </TouchableOpacity>
        </View>

        <VehicleInputModal
          visible={modalType === 'vehicle'}
          onSave={handleSaveVehicle}
          onClose={() => setModalType(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダーサマリー */}
      {selectedVehicle && activeTab !== 'vehicles' && (
        <VehicleSummaryCard
          vehicle={selectedVehicle}
          fuelRecords={vehicleFuelRecords}
          maintenanceRecords={vehicleMaintenanceRecords}
          onSelectVehicle={() => setActiveTab('vehicles')}
        />
      )}

      {/* メンテナンスアラート */}
      {selectedVehicle && activeTab === 'fuel' && (
        <MaintenanceAlerts
          currentOdometer={currentOdometer}
          maintenanceRecords={vehicleMaintenanceRecords}
        />
      )}

      {/* タブバー */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* コンテンツ */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'fuel' && (
          <>
            {vehicleFuelRecords.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabIcon}>⛽</Text>
                <Text style={styles.emptyTabText}>給油記録がありません</Text>
              </View>
            ) : (
              vehicleFuelRecords.map((record, index) => (
                <FuelRecordItem
                  key={record.id}
                  record={record}
                  previousRecord={vehicleFuelRecords[index + 1]}
                  onPress={() => {
                    setEditingFuel(record);
                    setModalType('fuel');
                  }}
                  onDelete={() => handleDeleteFuel(record)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'maintenance' && (
          <>
            {vehicleMaintenanceRecords.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabIcon}>🔧</Text>
                <Text style={styles.emptyTabText}>整備記録がありません</Text>
              </View>
            ) : (
              vehicleMaintenanceRecords.map(record => (
                <MaintenanceRecordItem
                  key={record.id}
                  record={record}
                  onPress={() => {
                    setEditingMaintenance(record);
                    setModalType('maintenance');
                  }}
                  onDelete={() => handleDeleteMaintenance(record)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'stats' && selectedVehicle && (
          <>
            <MonthlyCostChart
              fuelRecords={vehicleFuelRecords}
              maintenanceRecords={vehicleMaintenanceRecords}
            />
            <EfficiencyChart fuelRecords={vehicleFuelRecords} />
            
            {/* 統計サマリー */}
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>📋 累計統計</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statsItem}>
                  <Text style={styles.statsLabel}>総給油回数</Text>
                  <Text style={styles.statsValue}>{vehicleFuelRecords.length}回</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsLabel}>総給油量</Text>
                  <Text style={styles.statsValue}>
                    {formatNumber(vehicleFuelRecords.reduce((sum, r) => sum + r.liters, 0), 1)}L
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsLabel}>総燃料費</Text>
                  <Text style={styles.statsValue}>
                    {formatCurrency(vehicleFuelRecords.reduce((sum, r) => sum + r.totalCost, 0))}
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsLabel}>総整備費</Text>
                  <Text style={styles.statsValue}>
                    {formatCurrency(vehicleMaintenanceRecords.reduce((sum, r) => sum + r.cost, 0))}
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsLabel}>走行距離</Text>
                  <Text style={styles.statsValue}>
                    {(currentOdometer - selectedVehicle.initialOdometer).toLocaleString()}km
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsLabel}>平均単価</Text>
                  <Text style={styles.statsValue}>
                    ¥{vehicleFuelRecords.length > 0
                      ? Math.round(
                          vehicleFuelRecords.reduce((sum, r) => sum + r.pricePerLiter, 0) /
                            vehicleFuelRecords.length
                        )
                      : 0}/L
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'vehicles' && (
          <>
            {vehicles.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isSelected={vehicle.id === selectedVehicleId}
                fuelRecords={fuelRecords.filter(r => r.vehicleId === vehicle.id)}
                maintenanceRecords={maintenanceRecords.filter(r => r.vehicleId === vehicle.id)}
                onSelect={() => setSelectedVehicleId(vehicle.id)}
                onEdit={() => {
                  setEditingVehicle(vehicle);
                  setModalType('vehicle');
                }}
                onDelete={() => handleDeleteVehicle(vehicle)}
              />
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      {activeTab !== 'stats' && (
        <TouchableOpacity style={styles.fab} onPress={handleFabPress}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* モーダル */}
      {selectedVehicleId && (
        <>
          <FuelInputModal
            visible={modalType === 'fuel'}
            vehicleId={selectedVehicleId}
            lastOdometer={currentOdometer}
            editingRecord={editingFuel}
            onSave={handleSaveFuel}
            onClose={() => {
              setModalType(null);
              setEditingFuel(undefined);
            }}
          />

          <MaintenanceInputModal
            visible={modalType === 'maintenance'}
            vehicleId={selectedVehicleId}
            currentOdometer={currentOdometer}
            editingRecord={editingMaintenance}
            onSave={handleSaveMaintenance}
            onClose={() => {
              setModalType(null);
              setEditingMaintenance(undefined);
            }}
          />
        </>
      )}

      <VehicleInputModal
        visible={modalType === 'vehicle'}
        editingVehicle={editingVehicle}
        onSave={handleSaveVehicle}
        onClose={() => {
          setModalType(null);
          setEditingVehicle(undefined);
        }}
      />
    </View>
  );
};

// ===== スタイル =====
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // サマリーカード
  summaryCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  vehicleDetails: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  odometerBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  odometerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  odometerUnit: {
    fontSize: 10,
    color: COLORS.gray,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statSub: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 2,
  },
  totalCostBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  totalCostLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  totalCostValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },

  // タブバー
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  tabLabelActive: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // 記録アイテム
  recordItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordIcon: {
    fontSize: 22,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.black,
  },
  recordOdometer: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  recordStation: {
    fontSize: 11,
    color: COLORS.gray,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  recordLiters: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  recordDescription: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
    maxWidth: 100,
  },
  nextService: {
    fontSize: 10,
    color: COLORS.warning,
    marginTop: 4,
  },
  efficiencyBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  efficiencyValue: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  fullTankBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullTankText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: 'bold',
  },

  // アラート
  alertContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  alertItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // チャート
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingBottom: 30,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barSegment: {
    width: 24,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 6,
  },
  barValue: {
    fontSize: 9,
    color: COLORS.gray,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.gray,
  },

  // 燃費チャート
  efficiencyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  effStatItem: {
    alignItems: 'center',
  },
  effStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  effStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  lineChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 20,
  },
  lineChartPoint: {
    alignItems: 'center',
    flex: 1,
  },
  point: {
    position: 'absolute',
    alignItems: 'center',
  },
  pointValue: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  pointBar: {
    width: 6,
    backgroundColor: COLORS.primary + '40',
    borderRadius: 3,
  },
  pointLabel: {
    fontSize: 9,
    color: COLORS.gray,
    marginTop: 4,
  },
  noDataText: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 13,
    paddingVertical: 20,
  },

  // 統計
  statsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statsItem: {
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  statsLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 4,
  },

  // 車両カード
  vehicleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleCardSelected: {
    borderColor: COLORS.primary,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleCardIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  vehicleCardInfo: {
    flex: 1,
  },
  vehicleCardName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  vehicleCardDetails: {
    fontSize: 13,
    color: COLORS.gray,
  },
  selectedBadge: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  vehicleCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleCardStat: {
    fontSize: 12,
    color: COLORS.gray,
  },

  // 空状態
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTabIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyTabText: {
    fontSize: 15,
    color: COLORS.gray,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
    marginTop: -2,
  },

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.gray,
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 450,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },

  // 入力
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.black,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.black,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
  },
  totalDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginRight: 6,
    marginBottom: 6,
  },
  typeOptionText: {
    fontSize: 13,
    color: COLORS.black,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 15,
    color: COLORS.black,
  },
  iconSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  iconOptionSelected: {
    backgroundColor: COLORS.primary + '30',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  iconOptionText: {
    fontSize: 26,
  },
});

export default CarScreen;
