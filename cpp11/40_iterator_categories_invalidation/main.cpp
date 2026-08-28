#include <iostream>
#include <iterator>
#include <list>
#include <vector>

int main() {
    std::vector<int> numbers;
    numbers.reserve(3);
    numbers.push_back(10);
    numbers.push_back(20);

    std::vector<int>::iterator first = numbers.begin();
    numbers.push_back(30); // no reallocation: reserved capacity is 3
    std::cout << "vector_first=" << *first << '\n';

    std::list<int> linked{4, 5, 6};
    std::list<int>::iterator middle = linked.begin();
    std::advance(middle, 1); // works for non-random-access iterators
    std::cout << "list_middle=" << *middle << '\n';

    // Another vector insertion may reallocate and invalidate first.
}
