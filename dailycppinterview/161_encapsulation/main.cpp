// Real-World C++ Interviews Q161: Explain encapsulation with an example.
// Key: Encapsulation packages state with the operations that maintain its invariants and hides
// representation details behind a stable interface. It is not merely making fields private and
// adding unrestricted getters and setters: callers should express valid domain operations, such
// as `withdraw`, while the class rejects invalid transitions such as a negative balance. This
// reduces coupling and lets the implementation change without forcing callers to change.
#include <iostream>

class Account {
public:
    explicit Account(int balance) : balance_(balance >= 0 ? balance : 0) {}

    bool withdraw(int amount) {
        if (amount <= 0 || amount > balance_) return false;
        balance_ -= amount;
        return true;
    }

    int balance() const { return balance_; }

private:
    int balance_{};
};

int main() {
    Account account{100};
    account.withdraw(30);
    std::cout << account.balance() << std::endl;
}
