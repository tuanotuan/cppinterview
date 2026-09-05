// Real-World C++ Interviews Q148: What are access modifiers in C++?
// Key: The access specifiers `public`, `protected`, and `private` control where class members
// can be named. Public members are generally accessible, protected members are accessible to
// the class, friends, and derived classes, and private members to the class and friends; a
// `class` defaults to private access while a `struct` defaults to public. Access control is a
// compile-time interface rule, not a memory-security boundary.
#include <iostream>

class Account {
public:
    void deposit(int amount) {
        if (amount > 0) balance_ += amount;
        record_activity();
    }

    int balance() const { return balance_; }

protected:
    void record_activity() { ++activity_count_; }
    int activity_count() const { return activity_count_; }

private:
    int balance_{};
    int activity_count_{};
};

class AuditedAccount final : public Account {
public:
    int activities() const { return activity_count(); }
};

int main() {
    AuditedAccount account;
    account.deposit(50);
    std::cout << account.balance() << ' ' << account.activities() << std::endl;
}
