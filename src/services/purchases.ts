import Purchases, { 
  PurchasesOffering, 
  CustomerInfo,
  PurchasesPackage,
  PurchasesError,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// ============================================
// RevenueCat Configuration
// Replace these with your actual API keys from RevenueCat dashboard
// ============================================
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

// Entitlement IDs (configured in RevenueCat dashboard)
export const ENTITLEMENTS = {
  STARTER: 'starter',
  BASIC: 'basic',
  PRO: 'pro',
};

// Plan ID to RevenueCat product mapping
export const PLAN_TO_PRODUCT: Record<string, string> = {
  'basic': PRODUCT_IDS.BASIC_MONTHLY,
  'pro': PRODUCT_IDS.PRO_MONTHLY,
};

// Subscription status type
export interface SubscriptionStatus {
  isActive: boolean;
  currentPlan: 'free' | 'basic' | 'pro' | null;
  expirationDate: Date | null;
  willRenew: boolean;
}

// Purchase result type
export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
  cancelled?: boolean;
}

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

  // Get subscription status
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const customerInfo = await this.getCustomerInfo();
    
    if (!customerInfo) {
      return {
        isActive: false,
        currentPlan: null,
        expirationDate: null,
        willRenew: false,
      };
    }

    // Check entitlements in order of priority
    let currentPlan: 'free' | 'basic' | 'pro' | null = 'free';
    let expirationDate: Date | null = null;
    let willRenew = false;

    if (customerInfo.entitlements.active[ENTITLEMENTS.PRO]) {
      currentPlan = 'pro';
      const entitlement = customerInfo.entitlements.active[ENTITLEMENTS.PRO];
      expirationDate = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
      willRenew = entitlement.willRenew;
    } else if (customerInfo.entitlements.active[ENTITLEMENTS.BASIC]) {
      currentPlan = 'basic';
      const entitlement = customerInfo.entitlements.active[ENTITLEMENTS.BASIC];
      expirationDate = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
      willRenew = entitlement.willRenew;
    }

    return {
      isActive: currentPlan !== 'free',
      currentPlan,
      expirationDate,
      willRenew,
    };
  }

  // Purchase a plan by plan ID (e.g., 'basic', 'pro')
  async purchasePlan(planId: string): Promise<PurchaseResult> {
    try {
      await this.initialize();
      
      const offerings = await this.getOfferings();
      if (!offerings) {
        return { success: false, error: 'オファーを取得できませんでした' };
      }

      // Find the package for this plan
      const productId = PLAN_TO_PRODUCT[planId];
      if (!productId) {
        return { success: false, error: '無効なプランです' };
      }

      // Find package in current offering
      const pkg = offerings.availablePackages.find(
        p => p.product.identifier === productId
      );

      if (!pkg) {
        return { success: false, error: 'パッケージが見つかりません' };
      }

      const customerInfo = await this.purchasePackage(pkg);
      if (customerInfo) {
        return { success: true, customerInfo };
      }
      return { success: false, cancelled: true };
    } catch (error: any) {
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return { success: false, cancelled: true };
      }
      console.error('Purchase error:', error);
      return { success: false, error: error.message || '購入に失敗しました' };
    }
  }

  // Start free trial for Basic plan
  async startFreeTrial(): Promise<PurchaseResult> {
    return this.purchasePlan('basic');
  }

  // Check if user can access an agent
  async canAccessAgent(agentId: string, isPremiumAgent: boolean): Promise<boolean> {
    if (!isPremiumAgent) return true;
    
    const status = await this.getSubscriptionStatus();
    return status.currentPlan === 'basic' || status.currentPlan === 'pro';
  }

  // Check message limit for free users
  async canSendMessage(dailyMessageCount: number): Promise<boolean> {
    const FREE_DAILY_LIMIT = 3;
    const status = await this.getSubscriptionStatus();
    
    if (status.currentPlan !== 'free') {
      return true; // Paid users have unlimited messages
    }
    
    return dailyMessageCount < FREE_DAILY_LIMIT;
  }
}

export const purchaseService = new PurchaseService();
export default purchaseService;
