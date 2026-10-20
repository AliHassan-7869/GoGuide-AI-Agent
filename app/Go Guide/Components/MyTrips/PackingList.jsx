import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/constants';
import { useTheme } from '../constants/theme';

export default function PackingList({ items }) {
  const router = useRouter();
  const theme = useTheme();
  const [checkedItems, setCheckedItems] = useState({});
  const [expandedIndex, setExpandedIndex] = useState(null);

  const defaultItems = [
    { 
      item: "Valid Passport & ID", 
      category: "Essentials",
      desc: "Check expiry dates (at least 6 months validity recommended). Keep a digital copy on your phone."
    },
    { 
      item: "Phone Charger & Power Bank", 
      category: "Electronics",
      desc: "Pack a universal adapter for international travel. A high-capacity power bank is great for long tours."
    },
    { 
      item: "Basic First-aid Kit", 
      category: "Health",
      desc: "Include band-aids, painkillers, antiseptic wipes, and any personal medication you might need."
    },
    { 
      item: "Weather-appropriate Clothing", 
      category: "Clothing",
      desc: "Layering is key! Check the 7-day forecast before leaving and pack a light rain jacket just in case."
    },
  ];

  const displayItems = items && items.length > 0 ? items : defaultItems;
  const isDefault = !items || items.length === 0;
  
  const allChecked = displayItems.length > 0 && 
    displayItems.every((_, index) => checkedItems[index]);

  if (isDefault && !displayItems) return null; // Safety check

  const toggleItem = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleExpand = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    alert("Great job! You are all packed and ready for adventure! ✈️");
  };

  const renderItem = ({ item, index }) => (
    <View key={index} style={[styles.itemWrapper, { backgroundColor: theme.card }]}>
      <TouchableOpacity 
        style={styles.itemContainer} 
        onPress={() => toggleItem(index)}
        activeOpacity={0.7}
      >
        <View style={styles.leftContent}>
          <Ionicons 
            name={checkedItems[index] ? "checkbox" : "square-outline"} 
            size={24} 
            color={checkedItems[index] ? Colors.PRIMARY : theme.subtext} 
          />
          <View style={styles.textContainer}>
            <Text style={[
              styles.itemName, 
              { color: theme.text },
              checkedItems[index] && styles.checkedText
            ]}>
              {item.item}
            </Text>
            <Text style={[styles.category, { color: Colors.PRIMARY }]}>
              {item.category}
            </Text>
          </View>
        </View>
        
        {item.desc && (
          <TouchableOpacity 
            onPress={() => toggleExpand(index)} 
            style={styles.expandBtn}
          >
            <Ionicons 
              name={expandedIndex === index ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={theme.subtext} 
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {expandedIndex === index && item.desc && (
        <View style={styles.descContainer}>
          <Text style={[styles.descText, { color: theme.subtext }]}>
            {item.desc}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <MaterialCommunityIcons name="briefcase-check" size={24} color={Colors.PRIMARY} />
          <Text style={[styles.title, { color: theme.text }]}>Packing Checklist</Text>
        </View>
        {isDefault && (
          <View style={[styles.badge, { backgroundColor: Colors.PRIMARY + '20' }]}>
            <Text style={[styles.badgeText, { color: Colors.PRIMARY }]}>RECOMMENDED</Text>
          </View>
        )}
      </View>
      {displayItems.map((item, index) => renderItem({ item, index }))}

      {/* Full Checklist Navigation Button */}
      <TouchableOpacity 
        style={[styles.manageListBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/packing-checklist");
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="bag-check-outline" size={17} color={Colors.PRIMARY} style={{ marginRight: 8 }} />
        <Text style={[styles.manageListText, { color: theme.text }]}>Open Smart Luggage Checklist</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.subtext} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>

      {allChecked && (
        <TouchableOpacity 
          style={[styles.confirmBtn, { backgroundColor: Colors.PRIMARY }]}
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.confirmBtnText}>All Packed! Let's Go</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 25,
    marginBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    marginLeft: 10,
  },
  itemWrapper: {
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 15,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  category: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 2,
  },
  expandBtn: {
    padding: 5,
  },
  descContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  descText: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    lineHeight: 18,
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    marginLeft: 10,
  },
  manageListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  manageListText: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
});
