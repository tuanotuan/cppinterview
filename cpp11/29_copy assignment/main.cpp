#include <iostream>

class Order {
public:
    Order(int id, int quantity)
        : id_(id), quantity_(quantity) {}

    Order& operator=(const Order& other) {
        if (this == &other) {
            return *this;
        }

        id_ = other.id_;
        quantity_ = other.quantity_;
        std::cout << "Order assigned\n";
        return *this;
    }

    void print() const {
        std::cout << "ID: " << id_
                  << ", Quantity: " << quantity_
                  << '\n';
    }

private:
    int id_;
    int quantity_;
};

int main() {
    Order first{101, 50};
    Order second{202, 10};
    Order third{303, 5};

    third = second = first;

    first.print();
    second.print();
    third.print();
}
