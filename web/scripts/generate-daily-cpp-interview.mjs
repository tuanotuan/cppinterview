import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, "..");
const sourceRoot = path.join(repoRoot, "dailycppinterview");
const catalogPath = path.join(webRoot, "content", "daily-cpp-interview-source.json");
const registryPath = path.join(webRoot, "content", "lesson-registry.yaml");
const questionPath = path.join(webRoot, "content", "questions", "daily-cpp-interview.yaml");
const englishCatalogPath = path.join(webRoot, "src", "content-translations", "en.json");

// This label shipped inside the original 146 v1 source files and therefore
// participates in their immutable lesson/question hashes. New batches use the
// label declared by their provenance record instead of inheriting this legacy
// source name.
const immutableLegacySourceCollectionLabel = "Daily C++ Interview";

const difficultyLabel = {
  beginner: { vi: "Dễ", en: "Easy" },
  intermediate: { vi: "Trung bình", en: "Medium" },
  advanced: { vi: "Khó", en: "Hard" },
};

const syntaxByChapter = {
  "type-deduction": "auto value = expression; // inspect the exact deduced type",
  static: "static T value; // one storage duration or one class-wide member",
  polymorphism: "virtual void run(); // derived: void run() override;",
  lambdas: "auto result = [capture] { return expression; }();",
  const: "ReturnType operation() const;",
  "modern-practices": "Use the language construct that makes the contract compiler-checkable.",
  "smart-pointers": "auto owner = std::make_unique<T>();",
  references: "template<class T> void call(T&& value);",
  cpp20: "template<class T> concept Requirement = /* predicate */;",
  "special-members": "Type(const Type&) = default; Type(Type&&) noexcept = default;",
  "object-design": "Make ownership, invariants, and dispatch explicit in the interface.",
  behavior: "Check every language and library precondition before evaluating the expression.",
  stl: "std::algorithm(first, last, ...); // satisfy the documented range contract",
  "language-practice": "Prefer the form whose type, lifetime, and control flow are unambiguous.",
  "interview-foundations": "Make types, storage duration, and parameter semantics explicit.",
  "interview-core-techniques": "Make object invariants, dispatch, and cleanup explicit.",
  "interview-advanced-techniques": "Constrain generic code and preserve value-category intent.",
};

const codeContextByQuestion = {
  4: `auto myCollection = {1, 2, 3};`,
  113: `auto myCollection = {1, 2, 3};`,
  19: `#include <iostream>
#include <memory>

class Animal {
public:
    ~Animal() = default;

    virtual void eat(int quantity) {
        std::cout << "Animal eats " << quantity << '\\n';
    }

    void speak() {
        std::cout << "Animal speaks\\n";
    }
};

class Dog : public Animal {
public:
    void eat(unsigned int quantity) {
        std::cout << "Dog eats " << quantity << '\\n';
    }

    void speak() {
        std::cout << "Dog speaks\\n";
    }
};

int main() {
    Dog dog;
    dog.speak();
    dog.eat(42u);

    std::unique_ptr<Animal> animal = std::make_unique<Dog>();
    animal->speak();
    animal->eat(42u);
}`,
  28: `#include <iostream>

class A {
public:
    int value() { return 1; }
    int value() const { return 2; }
};

int main() {
    A a;
    const auto b = a.value();
    std::cout << b << '\\n';
}`,
  32: `#include <iostream>

class A {
public:
    int value() { return 1; }
    int value() const { return 2; }
};

int main() {
    A a;
    const auto b = a.value();
    std::cout << b << '\\n';
}`,
  115: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers{1, 54, 7, 5335, 8};
    std::cout << std::binary_search(numbers.begin(), numbers.end(), 7) << '\\n';
}`,
  126: `unsigned int a1 = 42;
unsigned int a2{42};
unsigned int a3 = -42;
unsigned int a4{-42};`,
  127: `#include <iostream>

int main() {
    std::cout << 25u - 50 << '\\n';
}`,
  129: `int main() {
    int a, b, c;
    a = 9;
    c = a + 1 + 1 * 0;
    b = c++;
}`,
  130: `#include <string>

int main() {
    std::string(foo);
}`,
  133: `class MyObject {
public:
    void doSomething() {}
};

int main() {
    MyObject o();
    o.doSomething();
}`,
};

function normalizeSourceText(value) {
  return value.replace(/\r\n?/g, "\n").replace(/\n/g, "\r\n");
}

function sourceHash(markdown, code) {
  return createHash("sha256")
    .update(normalizeSourceText(markdown))
    .update(normalizeSourceText(code))
    .digest("hex");
}

function commentLines(label, value) {
  const words = `${label}${value}`.split(/\s+/u);
  const lines = [];
  let line = "// ";
  for (const word of words) {
    if ((line + word).length > 96) {
      lines.push(line.trimEnd());
      line = "// ";
    }
    line += `${word} `;
  }
  if (line.trim() !== "//") lines.push(line.trimEnd());
  return lines.join("\n");
}

function sourceCollectionLabel(item) {
  const batch = sourceBatchByQuestionNumber.get(item.number);
  if (!batch) {
    throw new Error(`Question ${item.number} has no source batch`);
  }
  return batch.sourceLabel;
}

function commonPreamble(item) {
  return [
    commentLines(`${sourceCollectionLabel(item)} Q${String(item.number).padStart(3, "0")}: `, item.prompt.en),
    commentLines("Key: ", item.answer.en),
    "",
  ].join("\n");
}

function codeFor(item) {
  const special = specialCode(item.number) ?? curatedInterviewCode(item.number);
  if (special) return `${commonPreamble(item)}${special.trim()}\n`;

  const chapterSamples = {
    "type-deduction": `#include <type_traits>

int main() {
    const int source = ${item.number};
    auto value = source;
    const auto& view = source;
    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype(view), const int&>);
}`,
    static: `#include <iostream>

int next_id() {
    static int value = 0;
    return ++value;
}

int main() {
    std::cout << next_id() << ' ' << next_id() << '\\n';
}`,
    polymorphism: `#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return ${item.number}; }
};

int main() {
    Derived derived;
    const Base& base = derived;
    std::cout << base.value() << '\\n';
}`,
    lambdas: `#include <iostream>

int main() {
    const int seed = ${item.number};
    const auto result = [seed] { return seed + 1; }();
    std::cout << result << '\\n';
}`,
    const: `#include <iostream>

class Counter {
public:
    explicit Counter(int value) : value_(value) {}
    int value() const { return value_; }
    void increment() { ++value_; }

private:
    int value_;
};

int main() {
    const Counter counter{${item.number}};
    std::cout << counter.value() << '\\n';
}`,
    "modern-practices": `#include <iostream>
#include <type_traits>

enum class Result { success, failure };

int main() {
    constexpr Result result = Result::success;
    static_assert(std::is_enum_v<Result>);
    std::cout << (result == Result::success) << '\\n';
}`,
    "smart-pointers": `#include <iostream>
#include <memory>

struct Resource {
    explicit Resource(int value) : value(value) {}
    int value;
};

int main() {
    auto owner = std::make_unique<Resource>(${item.number});
    const Resource* observer = owner.get();
    std::cout << observer->value << '\\n';
}`,
    references: `#include <iostream>
#include <type_traits>
#include <utility>

template<class T>
decltype(auto) identity(T&& value) {
    return std::forward<T>(value);
}

int main() {
    int value = ${item.number};
    static_assert(std::is_lvalue_reference_v<decltype(identity(value))>);
    std::cout << identity(value) << '\\n';
}`,
    cpp20: `#include <concepts>
#include <iostream>

template<class T>
concept Number = std::integral<T> || std::floating_point<T>;

auto twice(Number auto value) {
    return value + value;
}

int main() {
    std::cout << twice(${item.number}) << '\\n';
}`,
    "special-members": `#include <iostream>
#include <string>

struct Value {
    std::string text;
};

int main() {
    Value first{std::to_string(${item.number})};
    Value second = first;
    std::cout << second.text << '\\n';
}`,
    "object-design": `#include <iostream>

class Score {
public:
    explicit Score(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    const Score score{${item.number}};
    std::cout << score.value() << '\\n';
}`,
    behavior: `#include <iostream>
#include <optional>

std::optional<int> checked_divide(int numerator, int denominator) {
    if (denominator == 0) return std::nullopt;
    return numerator / denominator;
}

int main() {
    const auto result = checked_divide(${item.number}, 2);
    if (result) std::cout << *result << '\\n';
}`,
    stl: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());
    std::cout << std::binary_search(values.begin(), values.end(), 2) << '\\n';
}`,
    "language-practice": `#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(${item.number}) << '\\n';
}`,
  };

  return `${commonPreamble(item)}${chapterSamples[item.chapter].trim()}\n`;
}

function curatedInterviewCode(number) {
  const samples = {
    147: `#include <iostream>
#include <vector>

template<class T>
T sum(const std::vector<T>& values) {
    T result{};
    for (const T& value : values) result += value;
    return result;
}

int main() {
    const std::vector<int> values{1, 2, 3};
    std::cout << sum(values) << std::endl;
}`,
    148: `#include <iostream>

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
}`,
    149: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());
    for (const int value : values) std::cout << value << ' ';
    std::cout << std::endl;
}`,
    150: `#include <iostream>

int main() {
    int first = 10;
    int second = 20;
    int* pointer = &first;
    int& reference = first;

    pointer = &second;
    reference = 30;

    std::cout << first << ' ' << *pointer << std::endl;
}`,
    151: `#include <iostream>
#include <memory>

int main() {
    int automatic = 10;
    auto dynamic = std::make_unique<int>(20);
    std::cout << automatic + *dynamic << std::endl;
}`,
    152: `#include <iostream>

int by_value(int value) {
    return value + 10;
}

void by_reference(int& value) {
    value += 10;
}

int main() {
    int first = 1;
    int second = 1;
    const int copied_result = by_value(first);
    by_reference(second);
    std::cout << first << ' ' << copied_result << ' ' << second << std::endl;
}`,
    153: `#include <iostream>
#include <memory>

class Number {
public:
    explicit Number(int value) : value_(std::make_unique<int>(value)) {}

    Number(const Number& other)
        : value_(std::make_unique<int>(*other.value_)) {}

    Number& operator=(const Number& other) {
        if (this != &other) value_ = std::make_unique<int>(*other.value_);
        return *this;
    }

    int value() const { return *value_; }
    void set(int value) { *value_ = value; }

private:
    std::unique_ptr<int> value_;
};

int main() {
    Number first{10};
    Number second = first;
    second.set(20);
    std::cout << first.value() << ' ' << second.value() << std::endl;
}`,
    154: `#include <cstdint>
#include <iostream>

constexpr std::uint64_t factorial(unsigned value) {
    return value < 2 ? 1 : value * factorial(value - 1);
}

int main() {
    static_assert(factorial(5) == 120);
    std::cout << factorial(6) << std::endl;
}`,
    155: `#include <iostream>
#include <string_view>

void print(int value) {
    std::cout << "integer: " << value << std::endl;
}

void print(std::string_view value) {
    std::cout << "text: " << value << std::endl;
}

int main() {
    print(42);
    print(std::string_view{"C++"});
}`,
    156: `#include <iostream>

struct Point {
    int x{};
    int y{};
};

class Counter {
public:
    explicit Counter(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_{};
};

int main() {
    const Point point{2, 3};
    const Counter counter{4};
    std::cout << point.x + point.y + counter.value() << std::endl;
}`,
    157: `#include <type_traits>
#include <utility>

int main() {
    const int source = 42;
    auto value = source;
    const auto& view = source;
    decltype(auto) exact = (view);

    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype(exact), const int&>);
}`,
    158: `#include <iostream>

class Box {
public:
    Box(double width, double height) : width_(width), height_(height) {}
    friend double area(const Box& box);

private:
    double width_{};
    double height_{};
};

double area(const Box& box) {
    return box.width_ * box.height_;
}

int main() {
    std::cout << area(Box{3.0, 4.0}) << std::endl;
}`,
    159: `#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual const char* name() const { return "Base"; }
};

struct Derived final : Base {
    const char* name() const override { return "Derived"; }
};

void print(const Base& value) {
    std::cout << value.name() << std::endl;
}

int main() {
    const Derived derived;
    const Base sliced = derived;
    print(sliced);
    print(derived);
}`,
    160: `#include <iostream>
#include <memory>

struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Square final : public Shape {
public:
    explicit Square(double side) : side_(side) {}
    double area() const override { return side_ * side_; }

private:
    double side_{};
};

int main() {
    const std::unique_ptr<Shape> shape = std::make_unique<Square>(3.0);
    std::cout << shape->area() << std::endl;
}`,
    161: `#include <iostream>

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
}`,
    162: `#include <iostream>

struct Printable {
    virtual ~Printable() = default;
    virtual void print() const = 0;
};

struct Identifiable {
    virtual ~Identifiable() = default;
    virtual int id() const = 0;
};

class Report final : public Printable, public Identifiable {
public:
    void print() const override { std::cout << "report " << id() << std::endl; }
    int id() const override { return 7; }
};

int main() {
    const Report report;
    report.print();
}`,
    163: `#include <iostream>

class Item {
public:
    explicit Item(int id) : id_(id) { ++live_count_; }
    Item(const Item& other) : id_(other.id_) { ++live_count_; }
    ~Item() { --live_count_; }

    int id() const { return id_; }
    static int live_count() { return live_count_; }

private:
    int id_{};
    inline static int live_count_{};
};

int main() {
    const Item first{1};
    const Item second{2};
    std::cout << first.id() << ' ' << second.id() << ' ' << Item::live_count()
              << std::endl;
}`,
    164: `#include <iostream>

class Widget {
public:
    Widget& set_value(int value) {
        this->value_ = value;
        return *this;
    }

    Widget& increment() {
        ++value_;
        return *this;
    }

    int value() const { return value_; }

private:
    int value_{};
};

int main() {
    Widget widget;
    std::cout << widget.set_value(4).increment().value() << std::endl;
}`,
    165: `#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return 2; }
};

int main() {
    const Derived derived;
    const Base& base = derived;
    std::cout << base.value() << std::endl;
}`,
    166: `#include <array>
#include <iostream>

int add(int left, int right) {
    return left + right;
}

int multiply(int left, int right) {
    return left * right;
}

using Operation = int (*)(int, int);

int main() {
    const std::array<Operation, 2> operations{&add, &multiply};
    for (const Operation operation : operations) {
        std::cout << operation(3, 4) << ' ';
    }
    std::cout << std::endl;
}`,
    167: `#include <iostream>

inline constexpr int square(int value) {
    return value * value;
}

int main() {
    static_assert(square(5) == 25);
    std::cout << square(7) << std::endl;
}`,
    168: `#include <iostream>
#include <stdexcept>

int divide(int numerator, int denominator) {
    if (denominator == 0) throw std::invalid_argument{"division by zero"};
    return numerator / denominator;
}

int main() {
    try {
        std::cout << divide(8, 0) << std::endl;
    } catch (const std::exception& error) {
        std::cout << error.what() << std::endl;
    }
}`,
    169: `#include <iostream>
#include <stdexcept>
#include <string>

class ParseError final : public std::runtime_error {
public:
    ParseError(int line, const std::string& message)
        : std::runtime_error(message), line_(line) {}

    int line() const { return line_; }

private:
    int line_{};
};

int main() {
    try {
        throw ParseError{7, "invalid token"};
    } catch (const ParseError& error) {
        std::cout << "line " << error.line() << ": " << error.what() << std::endl;
    }
}`,
    170: `#include <iostream>
#include <memory>
#include <stdexcept>

struct Resource {
    ~Resource() { std::cout << "released" << std::endl; }
};

void work() {
    const auto resource = std::make_unique<Resource>();
    throw std::runtime_error{"failure"};
}

int main() {
    try {
        work();
    } catch (const std::exception&) {
        std::cout << "caught" << std::endl;
    }
}`,
    171: `#include <concepts>
#include <cstddef>
#include <iostream>

template<std::totally_ordered T>
T max_value(T left, T right) {
    return left < right ? right : left;
}

template<class T, std::size_t Size>
struct FixedArray {
    T values[Size]{};
};

int main() {
    FixedArray<int, 3> values{{1, 2, 3}};
    std::cout << max_value(values.values[0], values.values[2]) << std::endl;
}`,
    172: `#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());

    std::unordered_map<std::string, int> counts{{"cpp", 3}};
    std::cout << values.front() << ' ' << counts.at("cpp") << std::endl;
}`,
    173: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    const int threshold = 3;
    const std::vector<int> values{1, 3, 5, 7};
    const auto above = std::count_if(
        values.begin(),
        values.end(),
        [threshold](int value) { return value > threshold; }
    );
    std::cout << above << std::endl;
}`,
    174: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct Message {
    std::string text;
    std::vector<int> payload;
};

int main() {
    Message source{"ready", {1, 2, 3}};
    Message target = std::move(source);
    std::cout << target.text << ' ' << target.payload.size() << std::endl;
}`,
    175: `#include <iostream>
#include <utility>

void category(const int&) {
    std::cout << "lvalue" << std::endl;
}

void category(int&&) {
    std::cout << "rvalue" << std::endl;
}

int main() {
    int value = 42;
    category(value);
    category(std::move(value));
    category(7);
}`,
    176: `#include <iostream>
#include <type_traits>

template<class T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
T twice(T value) {
    return value + value;
}

template<class T>
struct TypeName {
    static constexpr const char* value = "other";
};

template<>
struct TypeName<int> {
    static constexpr const char* value = "int";
};

int main() {
    std::cout << twice(21) << ' ' << TypeName<int>::value << std::endl;
}`,
  };

  return samples[number] ?? null;
}

function specialCode(number) {
  const samples = {
    4: `#include <initializer_list>
#include <type_traits>

int main() {
    auto myCollection = {1, 2, 3};
    static_assert(std::is_same_v<decltype(myCollection), std::initializer_list<int>>);
}`,
    5: `#include <vector>

auto first(const std::vector<int>& values) -> int {
    return values.front();
}

int main() {
    return first({42}) == 42 ? 0 : 1;
}`,
    6: `#include <type_traits>
#include <utility>

int main() {
    int value = 0;
    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype((value)), int&>);
    static_assert(std::is_same_v<decltype(std::move(value)), int&&>);
}`,
    7: `#include <type_traits>

int value = 42;

decltype(auto) access() {
    return (value);
}

int main() {
    static_assert(std::is_same_v<decltype(access()), int&>);
}`,
    8: `#include <type_traits>

int main() {
    const auto sum = true + true;
    static_assert(std::is_same_v<decltype(sum), const int>);
    return sum == 2 ? 0 : 1;
}`,
    13: `#include <iostream>

void choose(int) { std::cout << "overload int\\n"; }
void choose(double) { std::cout << "overload double\\n"; }

struct Base {
    virtual ~Base() = default;
    virtual void run() const { std::cout << "base\\n"; }
};

struct Derived : Base {
    void run() const override { std::cout << "derived override\\n"; }
};

int main() {
    choose(1);
    Derived derived;
    static_cast<const Base&>(derived).run();
}`,
    15: `struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived : Base {
    int value() const override { return 2; }
};

int main() {
    Derived value;
    return value.value() == 2 ? 0 : 1;
}`,
    17: `#include <iostream>

struct Root { int value = 42; };
struct Left : virtual Root {};
struct Right : virtual Root {};
struct Leaf : Left, Right {};

int main() {
    Leaf leaf;
    leaf.Left::value = 7;
    std::cout << leaf.Right::value << '\\n';
}`,
    19: codeContextByQuestion[19],
    22: `#include <iostream>

struct Base {
    Base() { identify(); }
    virtual ~Base() { identify(); }
    virtual void identify() const { std::cout << "Base\\n"; }
};

struct Derived : Base {
    void identify() const override { std::cout << "Derived\\n"; }
};

int main() {
    Derived value;
    value.identify();
}`,
    23: `#include <memory>

struct Base {
    virtual ~Base() = default;
};

struct Derived : Base {
    ~Derived() override = default;
};

int main() {
    std::unique_ptr<Base> value = std::make_unique<Derived>();
}`,
    26: `#include <iostream>

bool checked() {
    std::cout << "right operand evaluated\\n";
    return true;
}

int main() {
    const bool first = false && checked();
    const bool second = true || checked();
    std::cout << first << ' ' << second << '\\n';
}`,
    27: `#include <iostream>

struct Resource {
    ~Resource() { std::cout << "released\\n"; }
};

int main() {
    Resource resource;
}`,
    28: codeContextByQuestion[28],
    29: `void seats(int) {}
void seats(double) = delete;

int main() {
    seats(5);
#if 0
    seats(5.5); // error: use of deleted function
#endif
}`,
    30: `#include <iostream>

int main() {
    const auto value = [] {
        const int base = 40;
        return base + 2;
    }();
    std::cout << value << '\\n';
}`,
    31: `#include <iostream>
#include <memory>

int main() {
    int by_reference = 1;
    auto owned = std::make_unique<int>(2);
    auto call = [copy = 3, &by_reference, value = std::move(owned)] {
        ++by_reference;
        return copy + *value;
    };
    std::cout << call() << ' ' << by_reference << '\\n';
}`,
    32: codeContextByQuestion[32],
    41: `#include <iostream>

consteval int square(int value) {
    return value * value;
}

constinit int runtime_mutable = square(3);

int main() {
    ++runtime_mutable;
    std::cout << runtime_mutable << '\\n';
}`,
    43: `struct Meter {
    explicit Meter(double value) : value(value) {}
    double value;
};

void use(Meter) {}

int main() {
    use(Meter{2.0});
#if 0
    use(2.0); // blocked by explicit
#endif
}`,
    44: `#include <iostream>

struct Meter { long double value; };

constexpr Meter operator""_m(long double value) {
    return Meter{value};
}

int main() {
    constexpr auto distance = 2.5_m;
    std::cout << static_cast<double>(distance.value) << '\\n';
}`,
    45: `#include <cstddef>
#include <iostream>

void choose(int) { std::cout << "integer\\n"; }
void choose(const int*) { std::cout << "pointer\\n"; }

int main() {
    choose(nullptr);
}`,
    47: `#include <type_traits>

enum class Color : unsigned char { red, green, blue };

int main() {
    static_assert(std::is_same_v<std::underlying_type_t<Color>, unsigned char>);
    constexpr auto color = Color::green;
    return color == Color::green ? 0 : 1;
}`,
    48: `#include <type_traits>

struct NonCopyable {
    NonCopyable() = default;
    NonCopyable(const NonCopyable&) = delete;
    NonCopyable& operator=(const NonCopyable&) = delete;
};

int main() {
    static_assert(!std::is_copy_constructible_v<NonCopyable>);
}`,
    50: `#include <type_traits>

struct Record {
    int id;
    double value;
};

int main() {
    static_assert(std::is_trivially_copyable_v<Record>);
}`,
    51: `#include <iostream>

struct Resource {
    Resource() { std::cout << "acquire\\n"; }
    ~Resource() { std::cout << "release\\n"; }
};

int main() {
    Resource resource;
}`,
    52: `#include <iostream>
#include <memory>

int main() {
    auto owner = std::make_unique<int>(42);
    auto next_owner = std::move(owner);
    std::cout << *next_owner << ' ' << std::boolalpha << (owner == nullptr) << '\\n';
}`,
    53: `#include <iostream>
#include <memory>

int main() {
    auto first = std::make_shared<int>(42);
    auto second = first;
    std::cout << *second << ' ' << first.use_count() << '\\n';
}`,
    54: `#include <iostream>
#include <memory>

int main() {
    auto owner = std::make_shared<int>(42);
    std::weak_ptr<int> observer = owner;
    if (auto locked = observer.lock()) std::cout << *locked << '\\n';
}`,
    58: `#include <iostream>
#include <string>
#include <utility>

int main() {
    std::string source = "resource";
    std::string destination = std::move(source);
    std::cout << destination << '\\n';
}`,
    59: `#include <iostream>
#include <utility>

void consume(int&) { std::cout << "lvalue\\n"; }
void consume(int&&) { std::cout << "rvalue\\n"; }

template<class T>
void relay(T&& value) {
    consume(std::forward<T>(value));
}

int main() {
    int value = 0;
    relay(value);
    relay(1);
}`,
    61: `#include <type_traits>

template<class T>
using Lvalue = T&;

int main() {
    static_assert(std::is_same_v<Lvalue<int&>, int&>);
    static_assert(std::is_same_v<int&&, int&&>);
}`,
    62: `#include <iostream>

constexpr int square(int value) {
    return value * value;
}

int main(int argc, char**) {
    constexpr int compile_time = square(4);
    const int runtime = square(argc);
    std::cout << compile_time << ' ' << runtime << '\\n';
}`,
    64: `#include <concepts>
#include <iostream>

auto add(std::integral auto left, std::integral auto right) {
    return left + right;
}

int main() {
    std::cout << add(20, 22) << '\\n';
}`,
    66: `#include <compare>

struct Point {
    int x;
    int y;
    auto operator<=>(const Point&) const = default;
};

int main() {
    static_assert(Point{1, 2} < Point{2, 0});
}`,
    68: `#include <iostream>

// A real module example needs a toolchain-specific multi-file build:
//   export module geometry;
//   export int area(int width, int height);
// This portable fallback keeps the lesson sample executable everywhere.
int area(int width, int height) {
    return width * height;
}

int main() {
    std::cout << area(6, 7) << '\\n';
}`,
    69: `#include <algorithm>
#include <cstddef>

class Buffer {
public:
    explicit Buffer(std::size_t size) : size_(size), data_(new int[size]{}) {}
    ~Buffer() { delete[] data_; }
    Buffer(const Buffer& other) : Buffer(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
    }
    Buffer& operator=(const Buffer& other) {
        if (this == &other) return *this;
        Buffer copy(other);
        std::swap(size_, copy.size_);
        std::swap(data_, copy.data_);
        return *this;
    }

private:
    std::size_t size_;
    int* data_;
};

int main() {
    Buffer first(3);
    Buffer second = first;
}`,
    70: `#include <memory>
#include <utility>

class Owner {
public:
    Owner() : value_(std::make_unique<int>(42)) {}
    ~Owner() = default;
    Owner(const Owner& other) : value_(std::make_unique<int>(*other.value_)) {}
    Owner& operator=(const Owner& other) {
        if (this != &other) value_ = std::make_unique<int>(*other.value_);
        return *this;
    }
    Owner(Owner&&) noexcept = default;
    Owner& operator=(Owner&&) noexcept = default;

private:
    std::unique_ptr<int> value_;
};

int main() {
    Owner first;
    Owner second = std::move(first);
}`,
    71: `#include <string>
#include <vector>

struct Report {
    std::string title;
    std::vector<int> values;
};

int main() {
    Report first{"daily", {1, 2, 3}};
    Report second = first;
    Report third = std::move(second);
}`,
    76: `#include <type_traits>
#include <vector>

struct Value {
    int number = 0;
};

int main() {
    static_assert(std::is_default_constructible_v<Value>);
    std::vector<Value> values(3);
}`,
    77: `struct PublicData {
    int value;
};

class ProtectedInvariant {
public:
    explicit ProtectedInvariant(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    PublicData data{1};
    ProtectedInvariant object{2};
    return data.value + object.value() == 3 ? 0 : 1;
}`,
    78: `struct Value {
    Value() : Value(42) {}
    explicit Value(int value) : value(value) {}
    int value;
};

int main() {
    Value value;
    return value.value == 42 ? 0 : 1;
}`,
    82: `class Vault {
    friend int inspect(const Vault& value);

public:
    explicit Vault(int code) : code_(code) {}

private:
    int code_;
};

int inspect(const Vault& value) {
    return value.code_;
}

int main() {
    return inspect(Vault{42}) == 42 ? 0 : 1;
}`,
    83: `#include <iostream>

int next() {
    static int value = 0;
    return ++value;
}

void show(int value = next()) {
    std::cout << value << '\\n';
}

int main() {
    show();
    show();
}`,
    84: `#include <iostream>

struct Value {
    int number;
    void show() const {
        std::cout << this->number << '\\n';
    }
};

int main() {
    Value value{42};
    value.show();
}`,
    89: `#include <iostream>

enum class WriteMode { append, truncate };

void write(WriteMode mode) {
    std::cout << (mode == WriteMode::append ? "append" : "truncate") << '\\n';
}

int main() {
    write(WriteMode::append);
}`,
    90: `#include <iostream>
#include <memory>
#include <vector>

int main() {
    auto shared = std::make_shared<int>(1);
    auto shallow = shared;
    std::vector<int> deep_source{1};
    auto deep = deep_source;
    *shallow = 2;
    deep[0] = 3;
    std::cout << *shared << ' ' << deep_source[0] << '\\n';
}`,
    91: `#include <iostream>

struct Plain {
    int value;
    void operation() {}
};

struct Polymorphic {
    virtual ~Polymorphic() = default;
    int value;
};

int main() {
    std::cout << sizeof(Plain) << ' ' << sizeof(Polymorphic) << '\\n';
}`,
    92: `#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual const char* name() const { return "Base"; }
};

struct Derived : Base {
    const char* name() const override { return "Derived"; }
};

int main() {
    Derived object;
    const Base& view = object;
    std::cout << view.name() << '\\n';
}`,
    95: `#include <memory>

struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

struct Square : Shape {
    explicit Square(double side) : side(side) {}
    double area() const override { return side * side; }
    double side;
};

int main() {
    std::unique_ptr<Shape> shape = std::make_unique<Square>(2.0);
    return shape->area() == 4.0 ? 0 : 1;
}`,
    96: `#include <iostream>
#include <variant>

struct Circle { double radius; };
struct Square { double side; };

int main() {
    std::variant<Circle, Square> shape = Square{2.0};
    const auto area = std::visit([](const auto& value) {
        if constexpr (requires { value.radius; }) return 3.14 * value.radius * value.radius;
        else return value.side * value.side;
    }, shape);
    std::cout << area << '\\n';
}`,
    97: `#include <iostream>

template<class Derived>
struct Printable {
    void print() const {
        static_cast<const Derived&>(*this).print_impl();
    }
};

struct Answer : Printable<Answer> {
    void print_impl() const { std::cout << 42 << '\\n'; }
};

int main() {
    Answer{}.print();
}`,
    98: `#include <optional>

class Connection {
public:
    static std::optional<Connection> create(bool available) {
        if (!available) return std::nullopt;
        return Connection{};
    }

private:
    Connection() = default;
};

int main() {
    return Connection::create(true).has_value() ? 0 : 1;
}`,
    106: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3};
    const auto old_data = values.data();
    values.reserve(100);
    const bool reallocated = old_data != values.data();
    std::cout << std::boolalpha << reallocated << '\\n';
}`,
    110: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    const std::vector<int> left{1, 2, 3};
    const std::vector<int> right{10, 20};
    std::vector<int> sums;
    const auto count = std::min(left.size(), right.size());
    for (std::size_t index = 0; index < count; ++index) {
        sums.push_back(left[index] + right[index]);
    }
    std::cout << sums.size() << '\\n';
}`,
    111: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values;
    values.reserve(4);
    values.push_back(1);
    values.push_back(2);
    std::cout << values.size() << ' ' << values.capacity() << ' '
              << static_cast<const void*>(values.data()) << '\\n';
}`,
    114: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    const std::vector<int> values{1, 2, 3};
    const auto found = std::find(values.cbegin(), values.cend(), 2);
    if (found != values.cend()) std::cout << *found << '\\n';
}`,
    115: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers{1, 54, 7, 5335, 8};
    std::sort(numbers.begin(), numbers.end());
    std::cout << std::boolalpha
              << std::binary_search(numbers.begin(), numbers.end(), 7) << '\\n';
}`,
    119: `#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual void show(int value = 1) const { std::cout << "Base " << value << '\\n'; }
};

struct Derived : Base {
    void show(int value = 2) const override { std::cout << "Derived " << value << '\\n'; }
};

int main() {
    Derived object;
    const Base& base = object;
    base.show();
}`,
    121: `#include <iostream>
#include <optional>

class Value {
public:
    explicit Value(int input) : input_(input) {}
    int doubled() const {
        if (!cache_) cache_ = input_ * 2;
        return *cache_;
    }

private:
    int input_;
    mutable std::optional<int> cache_;
};

int main() {
    const Value value{21};
    std::cout << value.doubled() << '\\n';
}`,
    123: `#include <iostream>

inline int square(int value) {
    return value * value;
}

int main() {
    std::cout << square(6) << '\\n';
}`,
    124: `#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::runtime_error("failure");
    } catch (const std::exception& error) {
        std::cout << error.what() << '\\n';
    }
}`,
    125: `#include <iostream>

void increment(int& value) { ++value; }
void reset(int* value) { if (value) *value = 0; }

int main() {
    int value = 1;
    increment(value);
    reset(&value);
    std::cout << value << '\\n';
}`,
    126: `#include <limits>

int main() {
    unsigned int first = 42;
    unsigned int second{42};
    unsigned int third = -42;
#if 0
    unsigned int fourth{-42}; // narrowing: ill-formed
#endif
    return first == second && third == std::numeric_limits<unsigned int>::max() - 41 ? 0 : 1;
}`,
    127: `#include <iostream>
#include <limits>

int main() {
    const auto result = 25u - 50;
    std::cout << result << '\\n';
    return result == std::numeric_limits<unsigned int>::max() - 24 ? 0 : 1;
}`,
    128: `#include <iostream>

int main() {
    int prefix = 1;
    int postfix = 1;
    const int new_value = ++prefix;
    const int old_value = postfix++;
    std::cout << new_value << ' ' << old_value << ' ' << postfix << '\\n';
}`,
    129: `#include <iostream>

int main() {
    int a, b, c;
    a = 9;
    c = a + 1 + 1 * 0;
    b = c++;
    std::cout << a << ' ' << b << ' ' << c << '\\n';
}`,
    130: `#include <iostream>
#include <string>

int main() {
    std::string(foo);
    std::cout << std::boolalpha << foo.empty() << '\\n';
}`,
    131: `#include <iostream>

struct Value {
    int number = 42;
    Value() = default;
    explicit Value(int input) : number(input) {}
};

int main() {
    std::cout << Value{}.number << ' ' << Value{7}.number << '\\n';
}`,
    132: `struct Value {};

Value make_value() {
    Value value{};
    return value;
}

int main() {
    Value object{};
    (void)object;
}`,
    133: `class MyObject {
public:
    void doSomething() {}
};

int main() {
#if 0
    MyObject o(); // declares a function
    o.doSomething();
#endif
    MyObject object{};
    object.doSomething();
}`,
    134: `#include <iostream>
#include <string>
#include <string_view>

void show(std::string_view value) {
    std::cout << value.substr(0, 5) << '\\n';
}

int main() {
    const std::string owner = "hello view";
    show(owner);
}`,
    135: `#include <iostream>
#include <string_view>

int main() {
    constexpr std::string_view value = "daily interview";
    std::cout << std::boolalpha << value.starts_with("daily") << ' '
              << value.ends_with("view") << '\\n';
}`,
    136: `#include <iostream>

struct Value {
    Value() = default;
    Value(const Value&) { std::cout << "copy\\n"; }
};

Value create() {
    return Value{};
}

int main() {
    [[maybe_unused]] Value value = create();
}`,
    137: `#include <string>

struct Report {
    std::string text;
};

Report create(bool detailed) {
    if (detailed) return Report{"detailed"};
    return Report{"brief"};
}

int main() {
    const auto report = create(true);
    return report.text == "detailed" ? 0 : 1;
}`,
    138: `#include <type_traits>
#include <utility>

int main() {
    int value = 0;
    static_assert(std::is_lvalue_reference_v<decltype((value))>);
    static_assert(std::is_rvalue_reference_v<decltype(std::move(value))>);
    static_assert(!std::is_reference_v<decltype(42)>);
}`,
    139: `#include <utility>

int main() {
    const int signed_value = -3;
    const unsigned unsigned_value = 7;
    return std::cmp_less(signed_value, unsigned_value) ? 0 : 1;
}`,
    141: `#include <iostream>

void render(int width, int height = 10) {
    std::cout << width << 'x' << height << '\\n';
}

void render(const char* preset) {
    std::cout << preset << '\\n';
}

int main() {
    render(20);
    render("compact");
}`,
    143: `#include <iostream>

enum class State { idle, running, stopped };

const char* name(State state) {
    switch (state) {
        case State::idle: return "idle";
        case State::running: return "running";
        case State::stopped: return "stopped";
    }
    return "invalid";
}

int main() {
    std::cout << name(State::running) << '\\n';
}`,
    144: `#include <iostream>

#ifndef DAILY_CPP_INTERVIEW_SAMPLE_GUARD
#define DAILY_CPP_INTERVIEW_SAMPLE_GUARD
inline int guarded_value() { return 42; }
#endif

int main() {
    std::cout << guarded_value() << '\\n';
}`,
    146: `#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(-1) << ' ' << classify(0) << ' ' << classify(1) << '\\n';
}`,
  };

  const duplicate = {
    49: 29, 67: 41, 72: 58, 73: 27, 74: 48, 75: 50, 79: 16,
    80: 13, 81: 15, 85: 17, 86: 18, 87: 25, 88: 44, 112: 24,
    113: 4, 117: 22, 118: 83, 120: 94,
  };

  if (samples[number]) return samples[number];
  if (duplicate[number]) return samples[duplicate[number]] ?? null;
  return null;
}

function markdownPrompt(prompt) {
  return prompt.replaceAll("<filename>", "\\<filename\\>");
}

function lessonMarkdown(item, locale, code) {
  const isVi = locale === "vi";
  const prompt = markdownPrompt(item.prompt[locale]);
  const answer = item.answer[locale];
  const title = isVi
    ? `Câu ${String(item.number).padStart(3, "0")}: ${prompt}`
    : `Question ${String(item.number).padStart(3, "0")}: ${prompt}`;
  const chapter = catalog.chapters.find((entry) => entry.id === item.chapter);
  const difficulty = difficultyLabel[item.difficulty][locale];
  const syntax = item.syntax ?? syntaxByChapter[item.chapter];
  const collectionLabel = sourceCollectionLabel(item);
  const codeLines = code.split("\n");
  while (codeLines[0]?.startsWith("//")) codeLines.shift();
  while (codeLines[0]?.trim() === "") codeLines.shift();
  const codePreview = codeLines
    .slice(0, 12)
    .join("\n")
    .trim();

  if (isVi) {
    return `# ${title}

## 1. Vấn đề nó giải quyết

Đây là một chủ đề phỏng vấn C++ độc lập trong bộ ${collectionLabel}. Mục tiêu là trả lời đúng trọng tâm, nêu quy tắc chi phối và phân biệt hành vi do chuẩn quy định với chi tiết riêng của compiler.

## 2. Kiến thức cần có

- Cú pháp C++ cơ bản và cách đọc kiểu của biểu thức.
- Khái niệm lifetime, ownership, overload resolution hoặc library contract khi chúng liên quan.
- Khả năng lần theo một ví dụ nhỏ trước khi kết luận.

## 3. Ý tưởng cốt lõi

${answer}

Một câu trả lời phỏng vấn tốt nên nói kết luận trước, sau đó giải thích điều kiện áp dụng và chốt lại hệ quả thực tế.

## 4. Cú pháp tối thiểu

~~~cpp
${syntax}
~~~

Cú pháp chỉ là điểm bắt đầu; cần kiểm tra kiểu, value category, lifetime và precondition thay vì suy luận từ tên gọi.

## 5. Cách nó hoạt động

1. Xác định entity hoặc biểu thức mà câu hỏi đang nói tới.
2. Áp dụng quy tắc C++ phù hợp trước khi dự đoán output hay hiệu năng.
3. Nêu rõ trường hợp ngoại lệ, hành vi phụ thuộc implementation hoặc undefined behavior nếu có.
4. Kiểm chứng bằng một chương trình tối thiểu và warning nghiêm ngặt.

## 6. Lỗi thường gặp

- Trả lời theo một lần chạy duy nhất rồi xem đó là quy tắc của chuẩn.
- Nhầm ownership với quyền truy cập hoặc nhầm compile-time selection với runtime dispatch.
- Bỏ qua precondition, lifetime hay conversion ẩn.
- Khẳng định tuyệt đối trong khi đáp án phụ thuộc context.

## 7. Khi nào nên dùng

Dùng kiến thức này khi review API, đọc code, giải thích diagnostic hoặc thiết kế abstraction có liên quan đến ${chapter.vi}. Trong code production, hãy ưu tiên dạng làm contract hiện rõ và được compiler kiểm tra.

## 8. Ví dụ đơn giản

File <code>main.cpp</code> đi kèm là ví dụ nhỏ, tự chứa và biên dịch bằng C++20:

~~~cpp
${codePreview}
~~~

Chạy với warning nghiêm ngặt để đối chiếu kết luận thay vì ghi nhớ output máy móc.

## 9. Điều cần nhớ

- ${answer}
- Độ khó ước tính: **${difficulty}**.
- Câu hỏi giữ nguyên một mục nguồn; không có biến thể Dễ/Trung bình/Khó được tự sinh.
- Nội dung giải thích và code mẫu được biên soạn lại độc lập từ chủ đề phỏng vấn.

## 10. Câu hỏi tự kiểm tra

1. ${difficulty} — ${prompt}
`;
  }

  return `# ${title}

## 1. Problem It Solves

This is one self-contained C++ interview topic from the ${collectionLabel} collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

${answer}

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
${syntax}
~~~

Syntax is only the starting point. Check types, value categories, lifetimes, and preconditions rather than inferring behavior from a name.

## 5. How It Works

1. Identify the entity or expression named by the question.
2. Apply the relevant C++ rule before predicting output or performance.
3. Call out exceptions, implementation dependence, or undefined behavior where applicable.
4. Verify the reasoning with a minimal program and strict warnings.

## 6. Common Mistakes

- Treating one observed run as the language rule.
- Confusing ownership with access, or compile-time selection with runtime dispatch.
- Ignoring a precondition, lifetime, or implicit conversion.
- Giving an absolute answer when the result depends on context.

## 7. When to Use It

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to ${chapter.en}. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
${codePreview}
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- ${answer}
- Estimated difficulty: **${difficulty}**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. ${difficulty} — ${prompt}
`;
}

function questionRecord(item, hash, version) {
  const code = codeContextByQuestion[item.number];
  const type = code ? "code_reasoning" : item.difficulty === "advanced" ? "pitfall" : "recall";
  return {
    id: `dailycpp-q${String(item.number).padStart(3, "0")}-001`,
    lessonId: `dailycpp-q${String(item.number).padStart(3, "0")}`,
    type,
    responseMode: "text",
    difficulty: item.difficulty,
    interviewCategory: "language_knowledge",
    interviewFormat: "concept_explanation",
    estimatedMinutes: item.difficulty === "beginner" ? 2 : item.difficulty === "intermediate" ? 4 : 6,
    prompt: item.prompt.vi,
    ...(code ? { code } : {}),
    hint: "Nêu kết luận trước, sau đó chỉ ra quy tắc C++ và điều kiện khiến kết luận đó đúng.",
    answer: {
      short: item.answer.vi,
      detailed: `${item.answer.vi}\n\nHãy liên hệ trực tiếp kết luận với kiểu, lifetime, ownership, overload resolution hoặc library contract xuất hiện trong câu hỏi. Nếu kết quả phụ thuộc implementation hoặc vi phạm precondition, cần nói rõ thay vì chỉ đoán output.`,
    },
    rubric: {
      required: [
        "Trả lời trực tiếp đúng câu hỏi nguồn.",
        "Nêu đúng quy tắc C++ và điều kiện áp dụng.",
        "Không suy diễn từ một compiler hoặc một lần chạy duy nhất.",
      ],
      bonus: [
        "Nêu được hệ quả về thiết kế API, lifetime, ownership, portability hoặc hiệu năng.",
      ],
      misconceptions: [
        "Chỉ nhắc lại thuật ngữ mà không giải thích cơ chế hoặc điều kiện.",
      ],
    },
    sources: [
      { sectionId: "y-tuong-cot-loi" },
      { sectionId: "cach-no-hoat-dong" },
      { sectionId: "cau-hoi-tu-kiem-tra" },
    ],
    sourceHash: hash,
    status: "draft",
    version,
  };
}

function englishQuestionTranslation(item, hash, version) {
  return {
    questionId: `dailycpp-q${String(item.number).padStart(3, "0")}-001`,
    questionVersion: version,
    sourceHash: hash,
    status: "draft",
    prompt: item.prompt.en,
    hint: "Lead with the conclusion, then identify the C++ rule and the conditions that make it true.",
    answer: {
      short: item.answer.en,
      detailed: `${item.answer.en}\n\nConnect the conclusion directly to the type, lifetime, ownership, overload-resolution rule, or library contract present in the question. State implementation dependence or a violated precondition explicitly instead of merely guessing output.`,
    },
    rubric: {
      required: [
        "Directly answers the single source question.",
        "States the governing C++ rule and its conditions.",
        "Does not generalize from one compiler or one observed run.",
      ],
      bonus: [
        "Explains an API, lifetime, ownership, portability, or performance consequence.",
      ],
      misconceptions: [
        "Repeats a term without explaining its mechanism or conditions.",
      ],
    },
  };
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
if (!Number.isInteger(catalog.collection.questionCount) ||
    catalog.collection.questionCount < 1) {
  throw new Error("questionCount must be a positive integer");
}
if (catalog.questions.length !== catalog.collection.questionCount) {
  throw new Error(
    `Expected ${catalog.collection.questionCount} source questions, ` +
    `found ${catalog.questions.length}`,
  );
}
if (!Number.isInteger(catalog.collection.defaultQuestionVersion) ||
    catalog.collection.defaultQuestionVersion < 1) {
  throw new Error("defaultQuestionVersion must be a positive integer");
}

if (!Array.isArray(catalog.sourceBatches) || catalog.sourceBatches.length === 0) {
  throw new Error("At least one source batch is required");
}
const sourceBatchByQuestionNumber = new Map();
const sourceBatchIds = new Set();
for (const batch of catalog.sourceBatches) {
  if (typeof batch.id !== "string" || !batch.id.trim() ||
      sourceBatchIds.has(batch.id)) {
    throw new Error(`Invalid or duplicate source batch id: ${batch.id}`);
  }
  sourceBatchIds.add(batch.id);
  if (!Number.isInteger(batch.start) || !Number.isInteger(batch.end) ||
      batch.start < 1 || batch.end < batch.start) {
    throw new Error(`Source batch ${batch.id} has an invalid range`);
  }
  for (const field of ["sourceLabel", "author", "sourceEdition", "licenseBasis", "importPolicy"]) {
    if (typeof batch[field] !== "string" || !batch[field].trim()) {
      throw new Error(`Source batch ${batch.id} is missing ${field}`);
    }
  }
  for (let number = batch.start; number <= batch.end; number += 1) {
    if (sourceBatchByQuestionNumber.has(number)) {
      throw new Error(`Question ${number} belongs to overlapping source batches`);
    }
    sourceBatchByQuestionNumber.set(number, batch);
  }
}
const legacyBatch = catalog.sourceBatches.find(
  (batch) => batch.id === "sandor-dargo-2022",
);
if (!legacyBatch || legacyBatch.start !== 1 || legacyBatch.end !== 146 ||
    legacyBatch.sourceLabel !== immutableLegacySourceCollectionLabel) {
  throw new Error("The immutable Q001-Q146 source batch contract changed");
}

const sourceIds = new Set();
const directories = new Set();
for (const [index, item] of catalog.questions.entries()) {
  if (item.number !== index + 1) {
    throw new Error(`Question order breaks at index ${index}`);
  }
  if (!sourceBatchByQuestionNumber.has(item.number)) {
    throw new Error(`Question ${item.number} is not covered by a source batch`);
  }
  if (typeof item.sourceId !== "string" || !item.sourceId.trim() ||
      sourceIds.has(item.sourceId)) {
    throw new Error(`Question ${item.number} has an invalid or duplicate sourceId`);
  }
  sourceIds.add(item.sourceId);
  if (typeof item.directory !== "string" || !item.directory.trim() ||
      directories.has(item.directory)) {
    throw new Error(`Question ${item.number} has an invalid or duplicate directory`);
  }
  directories.add(item.directory);
  const chapter = catalog.chapters.find((candidate) => candidate.id === item.chapter);
  if (!chapter || item.number < chapter.start || item.number > chapter.end) {
    throw new Error(`Question ${item.number} has an invalid chapter assignment`);
  }
  if (!difficultyLabel[item.difficulty] ||
      !Number.isInteger(item.difficultyScore) ||
      item.difficultyScore < 1 ||
      item.difficultyScore > 5) {
    throw new Error(`Question ${item.number} has invalid difficulty metadata`);
  }
  for (const field of ["prompt", "answer"]) {
    for (const locale of ["vi", "en"]) {
      if (typeof item[field]?.[locale] !== "string" ||
          !item[field][locale].trim()) {
        throw new Error(`Question ${item.number} is missing ${field}.${locale}`);
      }
    }
  }
  if (item.syntax !== undefined &&
      (typeof item.syntax !== "string" || !item.syntax.trim())) {
    throw new Error(`Question ${item.number} has invalid syntax`);
  }
}
if (sourceBatchByQuestionNumber.size !== catalog.questions.length) {
  throw new Error("Source batch ranges must cover exactly the question inventory");
}

const normalizedPromptGroups = new Map();
for (const item of catalog.questions) {
  const key = item.prompt.en.trim().toLowerCase();
  normalizedPromptGroups.set(key, [...(normalizedPromptGroups.get(key) ?? []), item.number]);
}
const duplicateGroups = [...normalizedPromptGroups.values()].filter((numbers) => numbers.length > 1);
const repeatedQuestions = catalog.questions.filter((question) => question.repeatOf);
if (!Number.isInteger(catalog.collection.uniquePromptCount) ||
    normalizedPromptGroups.size !== catalog.collection.uniquePromptCount ||
    repeatedQuestions.length !== catalog.questions.length - normalizedPromptGroups.size ||
    duplicateGroups.length !== repeatedQuestions.length) {
  throw new Error(
    "Source duplicate contract does not match uniquePromptCount and repeatOf metadata",
  );
}
for (const item of repeatedQuestions) {
  const original = catalog.questions.find(
    (question) => question.sourceId === item.repeatOf,
  );
  if (!original || original.prompt.en !== item.prompt.en) {
    throw new Error(`Question ${item.number} has an invalid repeatOf source`);
  }
  if (original.difficulty !== item.difficulty) {
    throw new Error(`Question ${item.number} must retain its repeated prompt's difficulty`);
  }
}

const existingQuestionDocument = parseYaml(await readFile(questionPath, "utf8"));
const existingQuestions = new Map(
  existingQuestionDocument.questions.map((question) => [question.id, question]),
);
const generated = catalog.questions.map((item) => {
  const code = codeFor(item);
  const viMarkdown = lessonMarkdown(item, "vi", code);
  const enMarkdown = lessonMarkdown(item, "en", code);
  const hash = sourceHash(viMarkdown, code);
  const version = item.questionVersion ??
    catalog.collection.defaultQuestionVersion;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Question ${item.number} has an invalid questionVersion`);
  }
  const question = questionRecord(item, hash, version);
  const existing = existingQuestions.get(question.id);
  if (existing && existing.sourceHash !== hash && version <= existing.version) {
    throw new Error(
      `Question ${question.id} content changed at v${version}; ` +
      "increment questionVersion before regenerating immutable content",
    );
  }
  return {
    item,
    sourcePath: path.posix.join("dailycppinterview", item.directory),
    directory: path.join(sourceRoot, item.directory),
    code,
    viMarkdown,
    enMarkdown,
    hash,
    version,
    question,
  };
});

// Validate every immutable revision before touching generated files. A stale
// version must not leave a partially regenerated source tree behind.
await mkdir(sourceRoot, { recursive: true });
for (const entry of generated) {
  await mkdir(entry.directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(entry.directory, "vi.md"), entry.viMarkdown, "utf8"),
    writeFile(path.join(entry.directory, "en.md"), entry.enMarkdown, "utf8"),
    writeFile(path.join(entry.directory, "main.cpp"), entry.code, "utf8"),
  ]);
}

const registry = parseYaml(await readFile(registryPath, "utf8"));
registry.lessons = registry.lessons.filter((lesson) => lesson.track !== "dailycpp");
registry.lessons.push(...generated.map(({ item, sourcePath }, index) => ({
  id: `dailycpp-q${String(item.number).padStart(3, "0")}`,
  sourcePath,
  language: "cpp",
  track: "dailycpp",
  order: item.number,
  tags: ["daily-cpp-interview", item.chapter],
  prerequisites: index === 0
    ? []
    : [`dailycpp-q${String(item.number - 1).padStart(3, "0")}`],
})));
await writeFile(registryPath, stringifyYaml(registry, { lineWidth: 100 }), "utf8");

const questions = generated.map(({ question }) => question);
await writeFile(
  questionPath,
  stringifyYaml({ schemaVersion: 1, questions }, { lineWidth: 100 }),
  "utf8",
);

const englishCatalog = JSON.parse(await readFile(englishCatalogPath, "utf8"));
englishCatalog.questions = englishCatalog.questions
  .filter((question) => !question.questionId.startsWith("dailycpp-q"))
  .concat(generated.map(({ item, hash, version }) => {
    return englishQuestionTranslation(item, hash, version);
  }));
await writeFile(englishCatalogPath, `${JSON.stringify(englishCatalog, null, 2)}\n`, "utf8");

console.log(
  `Generated ${generated.length} Real-World C++ Interviews lessons, ${questions.length} questions, and ${generated.length} English question translations.`,
);
