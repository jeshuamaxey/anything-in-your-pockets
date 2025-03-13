import { SecurityPolicy, Bag, Scanner } from "@/types/gameTypes";
import seedrandom from 'seedrandom';

export const scanBag = (bag: Bag, scanner: Scanner<Bag>, securityPolicy: SecurityPolicy) => {
  const rng = seedrandom(bag.id);

  const susItem = bag.has_suspicious_item ? 1 : 0;
  const nonSusItem = bag.has_suspicious_item ? 0 : 1;

  const susAlertProb = scanner.response_rates.p_alert_given_sus_item * susItem + scanner.response_rates.p_alert_given_no_sus_item * nonSusItem;

  const suspiciousItemAlert = rng() < susAlertProb;

  const electronicsAlert = securityPolicy.bags.electronics_must_be_separate && bag.has_electronics ? rng() < scanner.response_rates.p_alert_given_electronics : false;
  const liquidsAlert = securityPolicy.bags.liquids_must_be_in_clear_plastic_bag && bag.has_liquids ? rng() < scanner.response_rates.p_alert_given_liquids : false;

  return {
    suspiciousItemAlert,
    electronicsAlert,
    liquidsAlert,
  };
}