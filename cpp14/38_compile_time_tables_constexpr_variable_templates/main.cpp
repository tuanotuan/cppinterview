#include <cstddef>
#include <iostream>

template <std::size_t N>
struct Table {
    int values[N]{};
    constexpr int& operator[](std::size_t index) { return values[index]; }
    constexpr const int& operator[](std::size_t index) const {
        return values[index];
    }
};

template <std::size_t N>
constexpr Table<N> make_squares() {
    Table<N> result{};
    for (std::size_t i = 0; i < N; ++i) {
        result[i] = static_cast<int>(i * i);
    }
    return result;
}

template <std::size_t N>
constexpr Table<N> squares = make_squares<N>();

int main() {
    static_assert(squares<5>[3] == 9, "compile-time table");
    std::cout << "squares:";
    for (std::size_t i = 0; i < 5; ++i) std::cout << ' ' << squares<5>[i];
    std::cout << "\n";
}
