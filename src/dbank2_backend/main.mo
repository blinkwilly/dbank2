persistent actor {
  stable var accountBalance: Float = 0;
public func topUp(amount: Float) : async () {
    accountBalance += amount;
};

public func withdraw(amount: Float) : async () {
    accountBalance -= amount;
};

public func checkBalance() : async Float {
    accountBalance;
};

};
