import { nationalities, Nationality } from "@/game-data/nationalities";
import { Bag, Passenger } from "@/types/gameTypes";
import { BAG_HAS_ELECTRONICS_PROPORTION, BAG_HAS_LIQUIDS_PROPORTION, BAG_SUSPICIOUS_ITEM_PROPORTION, PROPORTION_OF_PASSENGERS_WITH_BAGS } from "./game-constants";

// Generate a random passenger
export const generateRandomPassenger = (id: string): Passenger => {
  const sex = Math.random() > 0.5 ? 'male' : 'female';
  const presentingGender = Math.random() > 0.9 ? 'ambiguous' : sex;
  
  return {
    id,
    name: `Passenger ${id.substring(id.length - 3)}`,
    emoji: presentingGender === 'male' ? '👨' : presentingGender === 'female' ? '👩' : '🧒',
    nationality: getRandomNationality(),
    security_familiarity: Math.floor(Math.random() * 11),
    sex,
    presenting_gender: presentingGender,
    preferred_security_agent_gender: Math.random() > 0.8 
      ? (Math.random() > 0.5 ? 'male' : 'female') 
      : null,
    has_bag: Math.random() < PROPORTION_OF_PASSENGERS_WITH_BAGS, // 90% of passengers have bags
    waiting_since: undefined,
    bag: null,
    bag_on_person: false
  };
};

// Generate a random bag for a passenger
export const generateRandomBag = (passengerId: string, passengerName: string): Bag => {
  return {
    id: `bag_${passengerId.substring('passenger_'.length)}`, // Use the full passenger ID to ensure uniqueness
    passenger_id: passengerId,
    passenger_name: passengerName,
    has_electronics: Math.random() < BAG_HAS_ELECTRONICS_PROPORTION,
    has_suspicious_item: Math.random() < BAG_SUSPICIOUS_ITEM_PROPORTION,
    has_liquids: Math.random() < BAG_HAS_LIQUIDS_PROPORTION,
    suspicious_item_dealt_with: false,
    electronics_alert_dealt_with: false,
    liquids_alert_dealt_with: false,
    is_being_scanned: false,
    is_flagged: false,
    scan_complete: false,
    is_unloaded: false // Bag starts as not unloaded
  };
};

// Get a random nationality
export const getRandomNationality = (): Nationality => {
  return nationalities[Math.floor(Math.random() * nationalities.length)];
};