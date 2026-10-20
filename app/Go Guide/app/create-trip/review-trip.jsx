import { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CreateTripContext } from '../../context/CreateTripContext';
import { Colors } from '../../Components/constants/constants';
import StepProgressBar from '../../Components/CreateTrip/StepProgressBar';
import moment from 'moment';

const { width } = Dimensions.get('window');

export default function ReviewTrip() {
  const { tripData } = useContext(CreateTripContext);
  const router = useRouter();
  const [weather, setWeather] = useState(null);

  const handleBuildTrip = () => {
    router.push('/create-trip/generate-trip');
  };

  const formatDate = (date) => {
    if (!date) return 'Not Selected';
    return moment(date).format('DD MMM YYYY');
  };

  useEffect(() => {
    const fetchWeather = async () => {
      const lat = tripData?.toLocation?.coordinates?.lat;
      const lng = tripData?.toLocation?.coordinates?.lng;
      
      if (lat && lng) {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
          const data = await res.json();
          if (data && data.current_weather) {
            setWeather(data.current_weather);
          }
        } catch (error) {
          console.log("Error fetching weather:", error);
        }
      }
    };
    fetchWeather();
  }, [tripData]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT_LIGHT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}></Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <StepProgressBar currentStep={6} totalSteps={6} stepTitle="Final Review" />
        <Text style={styles.mainTitle}>Review your trip</Text>
        <Text style={styles.subtitle}>Before generating your itinerary, please review your selections.</Text>

        <View style={styles.card}>
          {/* Destination */}
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="location" size={24} color="#2E7D32" />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Destination</Text>
                <TouchableOpacity onPress={() => router.push('/create-trip/search-place')}>
                  <Ionicons name="create-outline" size={16} color={Colors.PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.value} numberOfLines={2}>
                {tripData?.toLocation?.name || 'Not Selected'}
              </Text>
            </View>
          </View>

          {/* Weather (Dynamic) */}
          {weather && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={[styles.iconContainer, { backgroundColor: '#E1F5FE' }]}>
                  <Ionicons name="partly-sunny-outline" size={24} color="#0288D1" />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.label}>Current Weather at Destination</Text>
                  <Text style={styles.value}>
                    {weather.temperature}°C (Wind: {weather.windspeed} km/h)
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />

          {/* Dates */}
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="calendar-outline" size={24} color="#1565C0" />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Travel Dates</Text>
                <TouchableOpacity onPress={() => router.push('/create-trip/select-dates')}>
                  <Ionicons name="create-outline" size={16} color={Colors.PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.value}>
                {formatDate(tripData?.startDate)}  to  {formatDate(tripData?.endDate)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Travelers */}
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="people-outline" size={24} color="#E65100" />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Who is Traveling</Text>
                <TouchableOpacity onPress={() => router.push('/create-trip/select-traveler')}>
                  <Ionicons name="create-outline" size={16} color={Colors.PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.value}>
                {tripData?.traveler?.title || 'Not Selected'} ({tripData?.traveler?.people || '0'})
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Budget */}
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: '#FCE4EC' }]}>
              <MaterialIcons name="attach-money" size={24} color="#C2185B" />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Budget Category</Text>
                <TouchableOpacity onPress={() => router.push('/create-trip/select-budget')}>
                  <Ionicons name="create-outline" size={16} color={Colors.PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.value}>{tripData?.budget || 'Not Selected'}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />

          {/* Transportation */}
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="car-outline" size={24} color="#6A1B9A" />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Transportation</Text>
                <TouchableOpacity onPress={() => router.push('/create-trip/interest-page')}>
                  <Ionicons name="create-outline" size={16} color={Colors.PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.value}>{tripData?.transportDetails?.name || tripData?.transport || 'Not Selected'}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />

          {/* Activities */}
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: '#E0F2F1' }]}>
              <Ionicons name="compass-outline" size={24} color="#00695C" />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Key Activities</Text>
                <TouchableOpacity onPress={() => router.push('/create-trip/interest-page')}>
                  <Ionicons name="create-outline" size={16} color={Colors.PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.value} numberOfLines={3}>
                {tripData?.interestsDetails?.length > 0 
                  ? tripData.interestsDetails.map(i => i.name).join(', ')
                  : 'Not Selected'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.buildButton} onPress={handleBuildTrip} activeOpacity={0.8}>
          <Text style={styles.buildButtonText}>Build My Trip</Text>
          <Ionicons name="rocket-outline" size={20} color={Colors.WHITE} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_LIGHT || '#F9F9F9',
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 50,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    marginLeft: 15,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 34,
    fontFamily: 'Outfit-Bold',
    marginTop: 10,
    color: Colors.TEXT_LIGHT || '#11181C',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: Colors.TEXT_GRAY || '#7D7D7D',
    marginTop: 10,
    marginBottom: 25,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.WHITE,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: Colors.TEXT_GRAY || '#7D7D7D',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
    color: Colors.TEXT_LIGHT || '#11181C',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.LIGHT_GRAY || '#E5E5E5',
    marginVertical: 8,
    marginHorizontal: -20,
  },
  footer: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    backgroundColor: Colors.WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  buildButton: {
    backgroundColor: Colors.PRIMARY || '#0a7ea4',
    borderRadius: 15,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.PRIMARY || '#0a7ea4',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
  },
  buildButtonText: {
    color: Colors.WHITE,
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
});
