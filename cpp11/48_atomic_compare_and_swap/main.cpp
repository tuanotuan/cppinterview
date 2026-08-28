#include <atomic>
#include <iostream>

int main() {
    std::atomic<int> value(5);

    int expected = 5;
    const bool changed = value.compare_exchange_strong(expected, 9);
    const int before_add = value.fetch_add(3);

    std::cout << std::boolalpha;
    std::cout << "changed=" << changed << '\n';
    std::cout << "before_add=" << before_add << '\n';
    std::cout << "after_add=" << value.load() << '\n';
}
