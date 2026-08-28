#include <functional>
#include <iostream>

int add(int left, int right) {
    return left + right;
}

struct Multiplier {
    int operator()(int value) const {
        return value * 3;
    }
};

void increment(int& value, int amount) {
    value += amount;
}

int main() {
    int (*function_pointer)(int, int) = add;
    std::function<int(int)> function_object = Multiplier();

    int total = 10;
    std::function<void(int)> bound =
        std::bind(increment, std::ref(total), std::placeholders::_1);

    std::cout << "pointer=" << function_pointer(2, 5) << '\n';
    std::cout << "functor=" << function_object(4) << '\n';
    bound(7);
    std::cout << "total=" << total << '\n';
}
