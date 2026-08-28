#include <initializer_list>
#include <iostream>

void show(int first, int second) {
    std::cout << "ordinary=" << first + second << '\n';
}

void show(std::initializer_list<int> values) {
    int sum = 0;
    for (int value : values) {
        sum += value;
    }
    std::cout << "list=" << sum << '\n';
}

int main() {
    show(1, 2);
    show({1, 2, 3}); // selects initializer_list overload
}
