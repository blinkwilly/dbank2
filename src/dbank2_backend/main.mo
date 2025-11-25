import Nat "mo:base/Nat";
import Array "mo:base/Array";

// Simple, stable Motoko backend with coupon support
persistent actor {
  stable var accountBalance : Float = 0.0;

  public type Coupon = {
    code : Text;
    reward : Float;
    usesLeft : Nat;
  };

  // Store coupons in a stable array of Coupon records
  stable var coupons : [Coupon] = [];
  stable var couponCounter : Nat = 0;

  public func topUp(amount : Float) : async () {
    accountBalance += amount;
  };

  public func withdraw(amount : Float) : async () {
    accountBalance -= amount;
  };

  public func checkBalance() : async Float {
    accountBalance;
  };

  // Admin function: create a coupon with reward and allowed uses
  public func generateCoupon(reward : Float, maxUses : Nat) : async Text {
    couponCounter += 1;
    let code = "CP" # Nat.toText(couponCounter);
    let c : Coupon = { code = code; reward = reward; usesLeft = maxUses };
    coupons := Array.append(coupons, [c]);
    code;
  };

  // Redeem a coupon by code. Returns ?Float (reward) or null if invalid/used up.
  public func redeemCoupon(code : Text) : async ?Float {
    var i : Nat = 0;
    while (i < coupons.size()) {
      let c = coupons[i];
      if (c.code == code) {
        if (c.usesLeft == 0) return null;
        let updated : Coupon = {
          code = c.code;
          reward = c.reward;
          usesLeft = c.usesLeft - 1;
        };
        let varArr = Array.thaw<Coupon>(coupons);
        varArr[i] := updated;
        coupons := Array.freeze<Coupon>(varArr);
        accountBalance += c.reward;
        return ?c.reward;
      };
      i += 1;
    };
    null;
  };

  // Optional: list coupon codes (for admin/testing)
  public func listCoupons() : async [Text] {
    var out : [Text] = [];
    var i : Nat = 0;
    while (i < coupons.size()) {
      let c = coupons[i];
      out := Array.append(out, [c.code]);
      i += 1;
    };
    out;
  };

};
