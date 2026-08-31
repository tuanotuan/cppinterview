#include <iostream>

#if defined(__cpp_explicit_this_parameter)
struct Counter {
    int value{0};

    void add(this Counter& self, int amount) {
        self.value += amount;
    }
};
#endif

int main() {
#if defined(__cpp_explicit_this_parameter)
    Counter counter;
    counter.add(5);
    std::cout << "counter=" << counter.value << '\n';
#else
    std::cout << "explicit object parameters unavailable\n";
#endif
}
