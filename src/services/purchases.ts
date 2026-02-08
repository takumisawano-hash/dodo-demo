import Purchases, { 
  PurchasesOffering, 
  CustomerInfo,
  PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Keys (replace with real keys)
const REVENUECAT_API_KEY_IOS = 'appl_XXXXXXXXXXXXXXXXXXXXXXXXXX';
const REVENUECAT_API_KEY_ANDROID = 'goog_XXXXXXXXXXXXXXXXXXXXXXXXXX';

// Product IDs (must match App Store Connect / Google Play Console)
export const PRODUCT_IDS = {
  // サブスクリプション
  STARTER_MONTHLY: 'dodo_starter_monthly',
  STARTER_YEARLY: 'dodo_starter_yearly',
  BASIC_MONTHLY: 'dodo_basic_monthly',
  BASIC_YEARLY: 'dodo_basic_yearly',
  PRO_MONTHLY: 'dodo_pro_monthly',
  PRO_YEARLY: 'dodo_pro_yearly',
  // アドオン（消耗型）
  SLOT_ADDON: 'dodo_slot_addon',
  MESSAGES_50: 'dodo_messages_50',
};

// Entitlement IDs
export const ENTITLEMENTS = {
  STARTER: 'starter',
  BASIC: 'basic',
  PRO: 'pro',
};

class PurchaseService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const apiKey = Platform.OS === 'ios' 
        ? REVENUECAT_API_KEY_IOS 
        : REVENUECAT_API_KEY_ANDROID;

      await Purchases.configure({ apiKey });
      this.initialized = true;
      console.log('RevenueCat initialized');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        console.error('Purchase failed:', error);
      }
      return null;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }

  async restorePurchases(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.restorePurchases();
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return null;
    }
  }

  // Check if user has active subscription
  async hasActiveSubscription(): Promise<string | null> {
    const customerInfo = await this.getCustomerInfo();
    if (!customerInfo) return null;

    // Check entitlements in order of priority
    if (customerInfo.entitlements.active[ENTITLEMENTS.PRO]) {
      return 'pro';
    }
    if (customerInfo.entitlements.active[ENTITLEMENTS.BASIC]) {
      return 'basic';
    }
    if (customerInfo.entitlements.active[ENTITLEMENTS.STARTER]) {
      return 'starter';
    }
    return null;
  }

  // Set user ID for RevenueCat (after authentication)
  async setUserId(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
    } catch (error) {
      console.error('Failed to set user ID:', error);
    }
  }

  // Log out user
  async logout(): Promise<void> {
    try {
      await Purchases.logOut();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }
}

export const purchaseService = new PurchaseService();
export default purchaseService;
