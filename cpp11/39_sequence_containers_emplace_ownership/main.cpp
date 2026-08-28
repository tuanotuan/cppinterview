#include <deque>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> names;
    names.emplace_back(3, 'A'); // constructs "AAA" in the vector
    names.emplace_back("Bob");

    std::deque<int> values;
    values.emplace_back(2);
    values.emplace_front(1);

    std::cout << "names=" << names[0] << ',' << names[1] << '\n';
    std::cout << "values=" << values.front() << ',' << values.back() << '\n';
}
